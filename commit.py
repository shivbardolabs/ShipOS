import asyncio
from sdk.tools.github_tools import coworker_git

COMMIT_MSG = """feat: v0.25.0 — 5 bug fixes + 4 features

Bug Fixes:
- BAR-257: Fix invisible headings on demo page dark theme (text-surface-900 -> text-foreground)
- BAR-252: Fix hardcoded carrier/department counts in migration analyze (now scaled by file size)
- BAR-255: Add toggle switches to mailbox platform config (was hardcoded Active badges)
- BAR-254: Wire up Add/Delete/Test Print buttons on label printers tab
- BAR-253: Replace simulated migration with real Prisma database writes

Features:
- BAR-256: Add tracking number lookup mode to package checkout
- BAR-38: Enhanced customer lookup with search mode tabs and walk-in support
- BAR-239: Move tracking number to Step 2 with carrier auto-detection from prefix
- BAR-245: Add conditional hazmat/perishable alerts and signature toggle to Step 3"""

async def main():
    r = await coworker_git(args=['add', '.'], working_dir='/work/repos/wt-batch9')
    print(r)
    
    r = await coworker_git(
        args=['-c', 'user.name=Viktor AI', '-c', 'user.email=viktor@bardolabs.ai',
              'commit', '-m', COMMIT_MSG],
        working_dir='/work/repos/wt-batch9'
    )
    print(r)

asyncio.run(main())
