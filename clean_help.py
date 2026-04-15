import re

with open("src/app/dashboard/help/page.tsx", "r") as f:
    text = f.read()

# Replace mentions of withdrawals in the help text
# 1. replace ", approve withdrawals" with ""
text = text.replace(", approve withdrawals, ", ", ")
# 2. replace "Payments & Withdrawals" with "Payments"
text = text.replace("Payments & Withdrawals", "Payments")

texts_to_remove = [
    """            {
                q: "How do members withdraw their earnings?",
                a: "Members go to Settings → Add bank account details → Navigate to Payments → Click 'Withdraw Funds' → Enter amount → Submit. Admins must approve the withdrawal before processing."
            },
""",
    """            {
                q: "How do I approve withdrawal requests?",
                a: "Go to Payments → Pending Approvals tab → Review withdrawal requests → Click 'Approve' or 'Reject'. Approved withdrawals are processed via Xendit automatically."
            },
"""
]

for t in texts_to_remove:
    text = text.replace(t, "")

with open("src/app/dashboard/help/page.tsx", "w") as f:
    f.write(text)
