# ShipOS — AWS Deployment Guide

A comprehensive, step-by-step guide for deploying ShipOS to a production AWS environment.

---

## Architecture Overview

```
                         ┌──────────────┐
                         │   Route 53   │
                         │  (DNS)       │
                         └──────┬───────┘
                                │
                         ┌──────▼───────┐
                         │  CloudFront  │
                         │  (CDN + SSL) │
                         └──────┬───────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
             ┌──────▼───────┐        ┌──────▼───────┐
             │     ALB      │        │      S3      │
             │ (Load Bal.)  │        │  (Static)    │
             └──────┬───────┘        └──────────────┘
                    │
           ┌────────┴────────┐
           │                 │
    ┌──────▼───────┐  ┌──────▼───────┐
    │ ECS Fargate  │  │ ECS Fargate  │
    │  (Task 1)    │  │  (Task 2)    │
    └──────┬───────┘  └──────┬───────┘
           │                 │
           └────────┬────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
 ┌──────▼───────┐       ┌──────▼───────┐
 │     RDS      │       │ ElastiCache  │
 │ (PostgreSQL) │       │   (Redis)    │
 └──────────────┘       └──────────────┘

 Supporting Services:
 ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
 │     SES      │  │     SNS      │  │  CloudWatch  │
 │   (Email)    │  │    (SMS)     │  │ (Monitoring) │
 └──────────────┘  └──────────────┘  └──────────────┘
 ┌──────────────┐  ┌──────────────┐
 │   Secrets    │  │ CodePipeline │
 │   Manager    │  │   (CI/CD)    │
 └──────────────┘  └──────────────┘
```

---

## Prerequisites

| Requirement | Details |
|-------------|---------|
| AWS Account | With admin (or broad IAM) access |
| AWS CLI v2 | Installed and configured (`aws configure`) |
| Docker | Installed locally for image builds |
| Domain name | Optional but strongly recommended |
| Git | For CI/CD pipeline integration |

```bash
# Verify prerequisites
aws --version          # aws-cli/2.x.x
docker --version       # Docker version 24+
git --version          # git version 2.x

# Set your AWS region (used throughout this guide)
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "Account: $AWS_ACCOUNT_ID | Region: $AWS_REGION"
```

---

## Infrastructure Components

| Component | AWS Service | Purpose | Est. Monthly Cost |
|-----------|------------|---------|-------------------|
| Compute | ECS Fargate | Run Next.js containers | ~$70 |
| Database | RDS PostgreSQL | Production database | ~$140 |
| Cache | ElastiCache Redis | Session & cache | ~$25 |
| Storage | S3 | File uploads, static assets | ~$5 |
| CDN | CloudFront | Global content delivery | ~$10 |
| Load Balancer | ALB | Traffic distribution | ~$25 |
| DNS | Route 53 | Domain management | ~$1 |
| SSL | ACM | TLS certificates | Free |
| Email | SES | Transactional email | ~$5 |
| SMS | SNS | SMS notifications | ~$5 |
| Secrets | Secrets Manager | API keys, credentials | ~$2 |
| Monitoring | CloudWatch | Logs, metrics, alarms | ~$10 |
| CI/CD | CodePipeline | Automated deployments | ~$3 |
| **Total** | | | **~$301/month** |

---

## Step 1: VPC & Networking

Before creating any resources, set up an isolated VPC.

### 1.1 Create VPC

```bash
# Create VPC
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=shipos-vpc}]' \
  --query 'Vpc.VpcId' --output text)

# Enable DNS hostnames (required for RDS)
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames

echo "VPC: $VPC_ID"
```

### 1.2 Create Subnets

Create public and private subnets across two availability zones:

```bash
# Public Subnets (for ALB)
PUB_SUBNET_1=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID --cidr-block 10.0.1.0/24 \
  --availability-zone ${AWS_REGION}a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=shipos-public-1}]' \
  --query 'Subnet.SubnetId' --output text)

PUB_SUBNET_2=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID --cidr-block 10.0.2.0/24 \
  --availability-zone ${AWS_REGION}b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=shipos-public-2}]' \
  --query 'Subnet.SubnetId' --output text)

# Private Subnets (for ECS, RDS, ElastiCache)
PRIV_SUBNET_1=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID --cidr-block 10.0.10.0/24 \
  --availability-zone ${AWS_REGION}a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=shipos-private-1}]' \
  --query 'Subnet.SubnetId' --output text)

PRIV_SUBNET_2=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID --cidr-block 10.0.11.0/24 \
  --availability-zone ${AWS_REGION}b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=shipos-private-2}]' \
  --query 'Subnet.SubnetId' --output text)

echo "Public:  $PUB_SUBNET_1, $PUB_SUBNET_2"
echo "Private: $PRIV_SUBNET_1, $PRIV_SUBNET_2"
```

### 1.3 Internet Gateway & NAT

```bash
# Internet Gateway (for public subnets)
IGW_ID=$(aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=shipos-igw}]' \
  --query 'InternetGateway.InternetGatewayId' --output text)

aws ec2 attach-internet-gateway --internet-gateway-id $IGW_ID --vpc-id $VPC_ID

# Public route table
PUB_RT=$(aws ec2 create-route-table --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=shipos-public-rt}]' \
  --query 'RouteTable.RouteTableId' --output text)

aws ec2 create-route --route-table-id $PUB_RT \
  --destination-cidr-block 0.0.0.0/0 --gateway-id $IGW_ID

aws ec2 associate-route-table --route-table-id $PUB_RT --subnet-id $PUB_SUBNET_1
aws ec2 associate-route-table --route-table-id $PUB_RT --subnet-id $PUB_SUBNET_2

# Elastic IP for NAT Gateway
EIP_ALLOC=$(aws ec2 allocate-address --domain vpc \
  --query 'AllocationId' --output text)

# NAT Gateway (for private subnet internet access)
NAT_ID=$(aws ec2 create-nat-gateway \
  --subnet-id $PUB_SUBNET_1 --allocation-id $EIP_ALLOC \
  --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=shipos-nat}]' \
  --query 'NatGateway.NatGatewayId' --output text)

echo "Waiting for NAT Gateway..."
aws ec2 wait nat-gateway-available --nat-gateway-ids $NAT_ID

# Private route table
PRIV_RT=$(aws ec2 create-route-table --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=shipos-private-rt}]' \
  --query 'RouteTable.RouteTableId' --output text)

aws ec2 create-route --route-table-id $PRIV_RT \
  --destination-cidr-block 0.0.0.0/0 --nat-gateway-id $NAT_ID

aws ec2 associate-route-table --route-table-id $PRIV_RT --subnet-id $PRIV_SUBNET_1
aws ec2 associate-route-table --route-table-id $PRIV_RT --subnet-id $PRIV_SUBNET_2
```

### 1.4 Security Groups

```bash
# ALB Security Group (public-facing)
ALB_SG=$(aws ec2 create-security-group \
  --group-name shipos-alb-sg --description "ShipOS ALB" \
  --vpc-id $VPC_ID --query 'GroupId' --output text)

aws ec2 authorize-security-group-ingress --group-id $ALB_SG \
  --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $ALB_SG \
  --protocol tcp --port 443 --cidr 0.0.0.0/0

# ECS Security Group (only from ALB)
ECS_SG=$(aws ec2 create-security-group \
  --group-name shipos-ecs-sg --description "ShipOS ECS Tasks" \
  --vpc-id $VPC_ID --query 'GroupId' --output text)

aws ec2 authorize-security-group-ingress --group-id $ECS_SG \
  --protocol tcp --port 3000 --source-group $ALB_SG

# RDS Security Group (only from ECS)
RDS_SG=$(aws ec2 create-security-group \
  --group-name shipos-rds-sg --description "ShipOS RDS" \
  --vpc-id $VPC_ID --query 'GroupId' --output text)

aws ec2 authorize-security-group-ingress --group-id $RDS_SG \
  --protocol tcp --port 5432 --source-group $ECS_SG

# Redis Security Group (only from ECS)
REDIS_SG=$(aws ec2 create-security-group \
  --group-name shipos-redis-sg --description "ShipOS Redis" \
  --vpc-id $VPC_ID --query 'GroupId' --output text)

aws ec2 authorize-security-group-ingress --group-id $REDIS_SG \
  --protocol tcp --port 6379 --source-group $ECS_SG

echo "Security Groups: ALB=$ALB_SG ECS=$ECS_SG RDS=$RDS_SG Redis=$REDIS_SG"
```

---

## Step 2: Database Setup (RDS PostgreSQL)

### 2.1 Create DB Subnet Group

```bash
aws rds create-db-subnet-group \
  --db-subnet-group-name shipos-db-subnets \
  --db-subnet-group-description "ShipOS DB subnets" \
  --subnet-ids $PRIV_SUBNET_1 $PRIV_SUBNET_2
```

### 2.2 Create RDS Instance

```bash
aws rds create-db-instance \
  --db-instance-identifier shipos-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 16.4 \
  --master-username shipos_admin \
  --master-user-password "$(openssl rand -base64 24)" \
  --allocated-storage 20 \
  --max-allocated-storage 100 \
  --storage-type gp3 \
  --db-name shipos \
  --vpc-security-group-ids $RDS_SG \
  --db-subnet-group-name shipos-db-subnets \
  --multi-az \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "sun:05:00-sun:06:00" \
  --storage-encrypted \
  --deletion-protection \
  --no-publicly-accessible \
  --tags Key=Project,Value=ShipOS Key=Environment,Value=production

echo "Waiting for RDS instance (5-10 minutes)..."
aws rds wait db-instance-available --db-instance-identifier shipos-db
```

> **Important:** Save the master password securely — you will store it in Secrets Manager in Step 7.

### 2.3 Get Database Endpoint

```bash
RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier shipos-db \
  --query 'DBInstances[0].Endpoint.Address' --output text)

echo "RDS Endpoint: $RDS_ENDPOINT"
echo "Connection: postgresql://shipos_admin:PASSWORD@${RDS_ENDPOINT}:5432/shipos"
```

### 2.4 Run Database Migrations

```bash
# Option A: Via one-off ECS task (after ECS is configured — see Step 3.7)
# Option B: From a temporary EC2 instance or Cloud9 in the same VPC:
DATABASE_URL="postgresql://shipos_admin:PASSWORD@${RDS_ENDPOINT}:5432/shipos"
npx prisma migrate deploy
npx tsx prisma/seed.ts
```

---

## Step 3: Container Setup (ECS Fargate)

### 3.1 Create ECR Repository

```bash
aws ecr create-repository \
  --repository-name shipos \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256 \
  --tags Key=Project,Value=ShipOS

ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/shipos"
echo "ECR: $ECR_URI"
```

### 3.2 Build & Push Docker Image

```bash
# Authenticate Docker with ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Build the production image
docker build -t shipos:latest .

# Tag for ECR
docker tag shipos:latest ${ECR_URI}:latest
docker tag shipos:latest ${ECR_URI}:$(git rev-parse --short HEAD)

# Push
docker push ${ECR_URI}:latest
docker push ${ECR_URI}:$(git rev-parse --short HEAD)
```

### 3.3 Create ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name shipos-cluster \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy \
    capacityProvider=FARGATE,weight=1,base=1 \
    capacityProvider=FARGATE_SPOT,weight=1 \
  --settings name=containerInsights,value=enabled \
  --tags key=Project,value=ShipOS
```

### 3.4 Create IAM Roles

**ECS Task Execution Role** (pulls images, writes logs):

```bash
cat > /tmp/ecs-trust.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "ecs-tasks.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
EOF

aws iam create-role \
  --role-name shipos-ecs-execution-role \
  --assume-role-policy-document file:///tmp/ecs-trust.json

aws iam attach-role-policy \
  --role-name shipos-ecs-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Allow Secrets Manager access
cat > /tmp/secrets-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["secretsmanager:GetSecretValue"],
    "Resource": "arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:shipos/*"
  }]
}
EOF

aws iam put-role-policy \
  --role-name shipos-ecs-execution-role \
  --policy-name SecretsAccess \
  --policy-document file:///tmp/secrets-policy.json
```

**ECS Task Role** (application runtime permissions):

```bash
aws iam create-role \
  --role-name shipos-ecs-task-role \
  --assume-role-policy-document file:///tmp/ecs-trust.json

# S3 access
cat > /tmp/s3-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket"],
    "Resource": ["arn:aws:s3:::shipos-uploads", "arn:aws:s3:::shipos-uploads/*"]
  }]
}
EOF
aws iam put-role-policy --role-name shipos-ecs-task-role \
  --policy-name S3Access --policy-document file:///tmp/s3-policy.json

# SES access
cat > /tmp/ses-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["ses:SendEmail", "ses:SendRawEmail"],
    "Resource": "*"
  }]
}
EOF
aws iam put-role-policy --role-name shipos-ecs-task-role \
  --policy-name SESAccess --policy-document file:///tmp/ses-policy.json

# SNS access
cat > /tmp/sns-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["sns:Publish"],
    "Resource": "*"
  }]
}
EOF
aws iam put-role-policy --role-name shipos-ecs-task-role \
  --policy-name SNSAccess --policy-document file:///tmp/sns-policy.json
```

### 3.5 Create CloudWatch Log Group

```bash
aws logs create-log-group \
  --log-group-name /ecs/shipos \
  --retention-in-days 30 \
  --tags Project=ShipOS
```

### 3.6 Create Task Definition

```bash
EXEC_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/shipos-ecs-execution-role"
TASK_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/shipos-ecs-task-role"

cat > /tmp/task-definition.json << EOF
{
  "family": "shipos",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "${EXEC_ROLE_ARN}",
  "taskRoleArn": "${TASK_ROLE_ARN}",
  "runtimePlatform": {
    "cpuArchitecture": "X86_64",
    "operatingSystemFamily": "LINUX"
  },
  "containerDefinitions": [{
    "name": "shipos",
    "image": "${ECR_URI}:latest",
    "essential": true,
    "portMappings": [{ "containerPort": 3000, "protocol": "tcp" }],
    "environment": [
      { "name": "NODE_ENV", "value": "production" },
      { "name": "PORT", "value": "3000" },
      { "name": "HOSTNAME", "value": "0.0.0.0" },
      { "name": "NEXT_PUBLIC_APP_URL", "value": "https://app.yourdomain.com" },
      { "name": "NEXTAUTH_URL", "value": "https://app.yourdomain.com" },
      { "name": "SES_REGION", "value": "${AWS_REGION}" },
      { "name": "SNS_REGION", "value": "${AWS_REGION}" },
      { "name": "S3_REGION", "value": "${AWS_REGION}" },
      { "name": "S3_BUCKET", "value": "shipos-uploads" }
    ],
    "secrets": [
      { "name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:shipos/database-url" },
      { "name": "NEXTAUTH_SECRET", "valueFrom": "arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:shipos/nextauth-secret" },
      { "name": "REDIS_URL", "valueFrom": "arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:shipos/redis-url" }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/shipos",
        "awslogs-region": "${AWS_REGION}",
        "awslogs-stream-prefix": "shipos"
      }
    },
    "healthCheck": {
      "command": ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"],
      "interval": 30, "timeout": 5, "retries": 3, "startPeriod": 15
    }
  }]
}
EOF

aws ecs register-task-definition --cli-input-json file:///tmp/task-definition.json
```

### 3.7 Create ECS Service

> Create the ALB first (Step 4), then run this command with `$TG_ARN`.

```bash
aws ecs create-service \
  --cluster shipos-cluster \
  --service-name shipos-service \
  --task-definition shipos \
  --desired-count 2 \
  --launch-type FARGATE \
  --platform-version LATEST \
  --network-configuration \
    "awsvpcConfiguration={subnets=[$PRIV_SUBNET_1,$PRIV_SUBNET_2],securityGroups=[$ECS_SG],assignPublicIp=DISABLED}" \
  --load-balancers \
    "targetGroupArn=$TG_ARN,containerName=shipos,containerPort=3000" \
  --deployment-configuration \
    "minimumHealthyPercent=50,maximumPercent=200,deploymentCircuitBreaker={enable=true,rollback=true}" \
  --enable-execute-command \
  --tags key=Project,value=ShipOS
```

---

## Step 4: Load Balancer (ALB)

### 4.1 Create Application Load Balancer

```bash
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name shipos-alb \
  --subnets $PUB_SUBNET_1 $PUB_SUBNET_2 \
  --security-groups $ALB_SG \
  --scheme internet-facing \
  --type application \
  --tags Key=Project,Value=ShipOS \
  --query 'LoadBalancers[0].LoadBalancerArn' --output text)

ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --query 'LoadBalancers[0].DNSName' --output text)

echo "ALB ARN: $ALB_ARN"
echo "ALB DNS: $ALB_DNS"
```

### 4.2 Create Target Group

```bash
TG_ARN=$(aws elbv2 create-target-group \
  --name shipos-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path /api/health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --matcher HttpCode=200 \
  --query 'TargetGroups[0].TargetGroupArn' --output text)

echo "Target Group: $TG_ARN"
```

### 4.3 SSL Certificate (ACM)

```bash
# Request certificate — validate via DNS
CERT_ARN=$(aws acm request-certificate \
  --domain-name app.yourdomain.com \
  --subject-alternative-names "*.yourdomain.com" \
  --validation-method DNS \
  --query 'CertificateArn' --output text)

echo "Certificate ARN: $CERT_ARN"
echo "→ Add the CNAME validation record(s) to your DNS provider"

# Wait for validation
aws acm wait certificate-validated --certificate-arn $CERT_ARN
```

### 4.4 Create Listeners

```bash
# HTTPS Listener (port 443)
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS --port 443 \
  --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 \
  --certificates CertificateArn=$CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN

# HTTP → HTTPS Redirect (port 80)
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP --port 80 \
  --default-actions "Type=redirect,RedirectConfig={Protocol=HTTPS,Port=443,StatusCode=HTTP_301}"
```

---

## Step 5: Cache (ElastiCache Redis)

### 5.1 Create Subnet Group

```bash
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name shipos-redis-subnets \
  --cache-subnet-group-description "ShipOS Redis subnets" \
  --subnet-ids $PRIV_SUBNET_1 $PRIV_SUBNET_2
```

### 5.2 Create Redis Cluster

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id shipos-redis \
  --cache-node-type cache.t3.micro \
  --engine redis --engine-version 7.1 \
  --num-cache-nodes 1 \
  --cache-subnet-group-name shipos-redis-subnets \
  --security-group-ids $REDIS_SG \
  --tags Key=Project,Value=ShipOS

echo "Waiting for Redis cluster..."
aws elasticache wait cache-cluster-available --cache-cluster-id shipos-redis

REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
  --cache-cluster-id shipos-redis --show-cache-node-info \
  --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' --output text)

echo "Redis URL: redis://${REDIS_ENDPOINT}:6379"
```

---

## Step 6: Storage (S3)

### 6.1 Create S3 Buckets

```bash
# Uploads bucket (label images, Form 1583 scans, signatures)
aws s3api create-bucket --bucket shipos-uploads --region $AWS_REGION

aws s3api put-bucket-versioning \
  --bucket shipos-uploads --versioning-configuration Status=Enabled

aws s3api put-public-access-block --bucket shipos-uploads \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# Static assets bucket
aws s3api create-bucket --bucket shipos-assets --region $AWS_REGION
```

### 6.2 CORS Configuration

```bash
cat > /tmp/cors.json << 'EOF'
{
  "CORSRules": [{
    "AllowedOrigins": ["https://app.yourdomain.com"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }]
}
EOF

aws s3api put-bucket-cors --bucket shipos-uploads --cors-configuration file:///tmp/cors.json
```

### 6.3 Lifecycle Policy

```bash
cat > /tmp/lifecycle.json << 'EOF'
{
  "Rules": [{
    "ID": "CleanupTempUploads",
    "Status": "Enabled",
    "Filter": { "Prefix": "tmp/" },
    "Expiration": { "Days": 7 }
  }]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
  --bucket shipos-uploads --lifecycle-configuration file:///tmp/lifecycle.json
```

---

## Step 7: CDN (CloudFront)

### 7.1 Create Distribution

```bash
cat > /tmp/cloudfront.json << EOF
{
  "CallerReference": "shipos-$(date +%s)",
  "Aliases": { "Quantity": 1, "Items": ["app.yourdomain.com"] },
  "DefaultRootObject": "",
  "Origins": {
    "Quantity": 1,
    "Items": [{
      "Id": "shipos-alb",
      "DomainName": "${ALB_DNS}",
      "CustomOriginConfig": {
        "HTTPPort": 80, "HTTPSPort": 443,
        "OriginProtocolPolicy": "https-only",
        "OriginSslProtocols": { "Quantity": 1, "Items": ["TLSv1.2"] }
      }
    }]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "shipos-alb",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 7,
      "Items": ["GET","HEAD","OPTIONS","PUT","POST","PATCH","DELETE"],
      "CachedMethods": { "Quantity": 2, "Items": ["GET","HEAD"] }
    },
    "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
    "OriginRequestPolicyId": "216adef6-5c7f-47e4-b989-5492eafa07d3",
    "Compress": true
  },
  "ViewerCertificate": {
    "ACMCertificateArn": "${CERT_ARN}",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  },
  "Enabled": true,
  "Comment": "ShipOS CDN",
  "PriceClass": "PriceClass_100",
  "HttpVersion": "http2and3"
}
EOF

CF_DIST_ID=$(aws cloudfront create-distribution \
  --distribution-config file:///tmp/cloudfront.json \
  --query 'Distribution.Id' --output text)

CF_DOMAIN=$(aws cloudfront get-distribution --id $CF_DIST_ID \
  --query 'Distribution.DomainName' --output text)

echo "CloudFront: $CF_DIST_ID → $CF_DOMAIN"
```

---

## Step 8: DNS (Route 53)

### 8.1 Hosted Zone Setup

```bash
HOSTED_ZONE_ID=$(aws route53 create-hosted-zone \
  --name yourdomain.com \
  --caller-reference "shipos-$(date +%s)" \
  --query 'HostedZone.Id' --output text | sed 's|/hostedzone/||')

echo "Hosted Zone: $HOSTED_ZONE_ID"
echo "→ Update your registrar's nameservers to:"
aws route53 get-hosted-zone --id $HOSTED_ZONE_ID \
  --query 'DelegationSet.NameServers' --output text
```

### 8.2 Create DNS Record

```bash
cat > /tmp/dns-records.json << EOF
{
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "app.yourdomain.com",
      "Type": "A",
      "AliasTarget": {
        "HostedZoneId": "Z2FDTNDATAQYW2",
        "DNSName": "${CF_DOMAIN}",
        "EvaluateTargetHealth": false
      }
    }
  }]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID --change-batch file:///tmp/dns-records.json
```

> `Z2FDTNDATAQYW2` is the fixed hosted zone ID for all CloudFront distributions.

---

## Step 9: Email & SMS

### 9.1 SES Setup (Email)

```bash
# Verify your domain
aws ses verify-domain-identity --domain yourdomain.com

# Get DKIM tokens — add as CNAME records in DNS
aws ses get-identity-dkim-attributes --identities yourdomain.com

# Verify "from" address (sandbox testing)
aws ses verify-email-identity --email-address noreply@yourdomain.com

# Request production access (to send to non-verified addresses)
aws ses put-account-details \
  --mail-type TRANSACTIONAL \
  --website-url "https://app.yourdomain.com" \
  --use-case-description "ShipOS sends package arrival notifications and compliance reminders to postal store customers. Customers opt-in at mailbox signup. ~500-2000 emails/day." \
  --additional-contact-email-addresses "admin@yourdomain.com" \
  --production-access-enabled
```

### 9.2 SNS Setup (SMS)

```bash
aws sns set-sms-attributes --attributes '{
  "DefaultSMSType": "Transactional",
  "MonthlySpendLimit": "100",
  "DefaultSenderID": "ShipOS"
}'
```

---

## Step 10: Secrets Management

```bash
# Database URL
aws secretsmanager create-secret \
  --name shipos/database-url \
  --secret-string "postgresql://shipos_admin:YOUR_PASSWORD@${RDS_ENDPOINT}:5432/shipos" \
  --tags Key=Project,Value=ShipOS

# NextAuth Secret
NEXTAUTH_SECRET=$(openssl rand -base64 32)
aws secretsmanager create-secret \
  --name shipos/nextauth-secret \
  --secret-string "$NEXTAUTH_SECRET" \
  --tags Key=Project,Value=ShipOS

# Redis URL
aws secretsmanager create-secret \
  --name shipos/redis-url \
  --secret-string "redis://${REDIS_ENDPOINT}:6379" \
  --tags Key=Project,Value=ShipOS
```

---

## Step 11: Monitoring & Logging

### 11.1 Create Alert Topic

```bash
ALERT_TOPIC_ARN=$(aws sns create-topic --name shipos-alerts \
  --query 'TopicArn' --output text)

aws sns subscribe --topic-arn $ALERT_TOPIC_ARN \
  --protocol email --notification-endpoint admin@yourdomain.com
```

### 11.2 CloudWatch Alarms

```bash
# ECS High CPU
aws cloudwatch put-metric-alarm \
  --alarm-name shipos-high-cpu \
  --metric-name CPUUtilization --namespace AWS/ECS \
  --statistic Average --period 300 --threshold 80 \
  --comparison-operator GreaterThanThreshold --evaluation-periods 2 \
  --dimensions Name=ClusterName,Value=shipos-cluster Name=ServiceName,Value=shipos-service \
  --alarm-actions $ALERT_TOPIC_ARN

# ECS High Memory
aws cloudwatch put-metric-alarm \
  --alarm-name shipos-high-memory \
  --metric-name MemoryUtilization --namespace AWS/ECS \
  --statistic Average --period 300 --threshold 85 \
  --comparison-operator GreaterThanThreshold --evaluation-periods 2 \
  --dimensions Name=ClusterName,Value=shipos-cluster Name=ServiceName,Value=shipos-service \
  --alarm-actions $ALERT_TOPIC_ARN

# RDS High CPU
aws cloudwatch put-metric-alarm \
  --alarm-name shipos-rds-high-cpu \
  --metric-name CPUUtilization --namespace AWS/RDS \
  --statistic Average --period 300 --threshold 80 \
  --comparison-operator GreaterThanThreshold --evaluation-periods 3 \
  --dimensions Name=DBInstanceIdentifier,Value=shipos-db \
  --alarm-actions $ALERT_TOPIC_ARN

# ALB 5xx Errors
aws cloudwatch put-metric-alarm \
  --alarm-name shipos-5xx-errors \
  --metric-name HTTPCode_ELB_5XX_Count --namespace AWS/ApplicationELB \
  --statistic Sum --period 300 --threshold 10 \
  --comparison-operator GreaterThanThreshold --evaluation-periods 1 \
  --dimensions Name=LoadBalancer,Value=$(echo $ALB_ARN | sed 's|.*loadbalancer/||') \
  --alarm-actions $ALERT_TOPIC_ARN --treat-missing-data notBreaching

# RDS Low Storage
aws cloudwatch put-metric-alarm \
  --alarm-name shipos-rds-low-storage \
  --metric-name FreeStorageSpace --namespace AWS/RDS \
  --statistic Average --period 300 --threshold 5368709120 \
  --comparison-operator LessThanThreshold --evaluation-periods 1 \
  --dimensions Name=DBInstanceIdentifier,Value=shipos-db \
  --alarm-actions $ALERT_TOPIC_ARN
```

### 11.3 CloudWatch Dashboard

```bash
cat > /tmp/dashboard.json << 'EOF'
{
  "widgets": [
    {
      "type": "metric", "x": 0, "y": 0, "width": 12, "height": 6,
      "properties": {
        "title": "ECS CPU & Memory",
        "metrics": [
          ["AWS/ECS","CPUUtilization","ClusterName","shipos-cluster","ServiceName","shipos-service"],
          ["AWS/ECS","MemoryUtilization","ClusterName","shipos-cluster","ServiceName","shipos-service"]
        ],
        "period": 300, "stat": "Average", "view": "timeSeries"
      }
    },
    {
      "type": "metric", "x": 12, "y": 0, "width": 12, "height": 6,
      "properties": {
        "title": "ALB Requests & Latency",
        "metrics": [
          ["AWS/ApplicationELB","RequestCount","LoadBalancer","shipos-alb",{"stat":"Sum"}],
          ["AWS/ApplicationELB","TargetResponseTime","LoadBalancer","shipos-alb",{"stat":"Average","yAxis":"right"}]
        ],
        "period": 300, "view": "timeSeries"
      }
    },
    {
      "type": "metric", "x": 0, "y": 6, "width": 12, "height": 6,
      "properties": {
        "title": "RDS Performance",
        "metrics": [
          ["AWS/RDS","CPUUtilization","DBInstanceIdentifier","shipos-db"],
          ["AWS/RDS","DatabaseConnections","DBInstanceIdentifier","shipos-db",{"yAxis":"right"}]
        ],
        "period": 300, "view": "timeSeries"
      }
    },
    {
      "type": "metric", "x": 12, "y": 6, "width": 12, "height": 6,
      "properties": {
        "title": "HTTP Status Codes",
        "metrics": [
          ["AWS/ApplicationELB","HTTPCode_Target_2XX_Count","LoadBalancer","shipos-alb",{"stat":"Sum","color":"#2ca02c"}],
          ["AWS/ApplicationELB","HTTPCode_Target_4XX_Count","LoadBalancer","shipos-alb",{"stat":"Sum","color":"#ff7f0e"}],
          ["AWS/ApplicationELB","HTTPCode_Target_5XX_Count","LoadBalancer","shipos-alb",{"stat":"Sum","color":"#d62728"}]
        ],
        "period": 300, "view": "timeSeries"
      }
    }
  ]
}
EOF

aws cloudwatch put-dashboard --dashboard-name ShipOS --dashboard-body file:///tmp/dashboard.json
```

---

## Step 12: CI/CD Pipeline

### 12.1 buildspec.yml

Create `buildspec.yml` in the repository root:

```yaml
version: 0.2

env:
  variables:
    ECR_REPO: shipos
    ECS_CLUSTER: shipos-cluster
    ECS_SERVICE: shipos-service
    DOCKER_BUILDKIT: "1"

phases:
  pre_build:
    commands:
      - echo "Logging in to ECR..."
      - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com
      - COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)
      - IMAGE_TAG=${COMMIT_HASH:-latest}
      - REPOSITORY_URI=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$ECR_REPO

  build:
    commands:
      - echo "Building Docker image..."
      - docker build -t $REPOSITORY_URI:$IMAGE_TAG .
      - docker tag $REPOSITORY_URI:$IMAGE_TAG $REPOSITORY_URI:latest

  post_build:
    commands:
      - echo "Pushing to ECR..."
      - docker push $REPOSITORY_URI:$IMAGE_TAG
      - docker push $REPOSITORY_URI:latest
      - printf '[{"name":"shipos","imageUri":"%s"}]' $REPOSITORY_URI:$IMAGE_TAG > imagedefinitions.json

artifacts:
  files:
    - imagedefinitions.json
```

### 12.2 Create CodePipeline

```bash
# The pipeline has three stages: Source (GitHub) → Build (CodeBuild) → Deploy (ECS)
# See the full pipeline JSON in Step 12.3 of the expanded guide.

# Quick setup with the console:
# 1. Go to CodePipeline → Create Pipeline
# 2. Source: GitHub (v2) → select ShipOS repo → main branch
# 3. Build: CodeBuild → create project with buildspec.yml
# 4. Deploy: Amazon ECS → shipos-cluster → shipos-service
```

---

## Step 13: Production Checklist

### Infrastructure
- [ ] VPC with public + private subnets across 2 AZs
- [ ] Security groups restrict traffic to minimum required
- [ ] NAT Gateway for private subnet outbound access
- [ ] All resources tagged with `Project=ShipOS`

### Database
- [ ] RDS Multi-AZ enabled
- [ ] Automated backups with 7-day retention
- [ ] Storage encryption enabled
- [ ] Deletion protection enabled
- [ ] Prisma migrations applied
- [ ] Seed data loaded (or production data migrated)

### Application
- [ ] Docker image built and pushed to ECR
- [ ] ECS service running with 2+ tasks
- [ ] Health checks passing on all tasks
- [ ] Environment variables via Secrets Manager
- [ ] ECS Exec enabled for debugging

### Networking
- [ ] ALB health checks passing
- [ ] SSL certificate validated and active
- [ ] HTTP → HTTPS redirect working
- [ ] CloudFront distribution deployed
- [ ] DNS records pointing to CloudFront

### Email & SMS
- [ ] SES domain verified with DKIM
- [ ] SES moved out of sandbox
- [ ] SNS SMS spending limit configured
- [ ] Test notifications sent successfully

### Monitoring
- [ ] CloudWatch log groups created
- [ ] CPU, memory, and error alarms configured
- [ ] Alert SNS topic with email subscriptions
- [ ] CloudWatch dashboard created

### Security
- [ ] IAM roles follow least-privilege principle
- [ ] All secrets in Secrets Manager
- [ ] S3 buckets block public access
- [ ] RDS not publicly accessible
- [ ] Security groups reviewed and locked down

---

## Cost Estimation

| Service | Config | Monthly Est. |
|---------|--------|-------------|
| ECS Fargate | 2 tasks × 0.5 vCPU / 1 GB | ~$70 |
| RDS PostgreSQL | db.t3.medium, Multi-AZ | ~$140 |
| ElastiCache Redis | cache.t3.micro | ~$25 |
| ALB | 1 ALB + data processing | ~$25 |
| CloudFront | ~50 GB transfer | ~$10 |
| NAT Gateway | 1 gateway + data | ~$35 |
| S3 | ~10 GB storage | ~$5 |
| Route 53 | 1 hosted zone | ~$1 |
| SES | ~5,000 emails | ~$5 |
| Secrets Manager | 3 secrets | ~$2 |
| CloudWatch | Logs + alarms + dashboard | ~$10 |
| CodePipeline | 1 pipeline | ~$3 |
| **Total** | | **~$331/month** |

**Cost optimization tips:**
- Use `FARGATE_SPOT` for non-critical tasks (~70% savings)
- Start with `db.t3.small` for low traffic (~$70 savings)
- Single-AZ RDS for non-critical deployments (~50% RDS savings)
- VPC endpoints instead of NAT Gateway for AWS service traffic

---

## Scaling Guide

### Horizontal Scaling

```bash
# Immediate: increase task count
aws ecs update-service --cluster shipos-cluster \
  --service shipos-service --desired-count 4

# Auto-scaling
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/shipos-cluster/shipos-service \
  --min-capacity 2 --max-capacity 10

aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/shipos-cluster/shipos-service \
  --policy-name shipos-cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    },
    "ScaleOutCooldown": 300, "ScaleInCooldown": 300
  }'
```

### Vertical Scaling

```bash
# Upgrade RDS instance
aws rds modify-db-instance \
  --db-instance-identifier shipos-db \
  --db-instance-class db.t3.large --apply-immediately

# Read replica for reporting
aws rds create-db-instance-read-replica \
  --db-instance-identifier shipos-db-reader \
  --source-db-instance-identifier shipos-db \
  --db-instance-class db.t3.medium
```

---

## Troubleshooting

### ECS Tasks Keep Restarting

```bash
# Check stopped reason
aws ecs describe-tasks --cluster shipos-cluster \
  --tasks $(aws ecs list-tasks --cluster shipos-cluster \
    --service shipos-service --query 'taskArns[0]' --output text) \
  --query 'tasks[0].stoppedReason'

# Check logs
aws logs tail /ecs/shipos --since 30m --follow

# Exec into container
aws ecs execute-command --cluster shipos-cluster --task TASK_ID \
  --container shipos --interactive --command "/bin/sh"
```

### Database Connection Issues

```bash
# Verify security group allows ECS → RDS
aws ec2 describe-security-groups --group-ids $RDS_SG

# Test from ECS container
# nc -zv RDS_ENDPOINT 5432
```

### ALB Health Checks Failing

```bash
aws elbv2 describe-target-health --target-group-arn $TG_ARN

# Common causes:
# 1. App not listening on port 3000
# 2. /api/health returns non-200
# 3. ECS_SG doesn't allow ALB traffic
```

### High Memory Usage

```bash
# Add to task definition environment:
# { "name": "NODE_OPTIONS", "value": "--max-old-space-size=768" }
```

### Useful Commands

```bash
# Deploy new image
docker build -t $ECR_URI:v2 . && docker push $ECR_URI:v2
aws ecs update-service --cluster shipos-cluster --service shipos-service --force-new-deployment

# Tail logs
aws logs tail /ecs/shipos --follow

# Manual backup
aws rds create-db-snapshot --db-instance-identifier shipos-db \
  --db-snapshot-identifier shipos-$(date +%Y%m%d)

# Pipeline status
aws codepipeline get-pipeline-state --name shipos-pipeline
```
