---
description: Run the legal/compliance agent team on the current diff or a described initiative
---

Run a legal/compliance review. Subject: $ARGUMENTS (if empty, review the
current uncommitted diff and any branch commits not on main).

1. Launch the `legal-counsel` agent with the subject to get an overall
   assessment and the list of specialist reviews needed.
2. Launch the specialist agents it recommends (`marketing-claims-reviewer`,
   `email-compliance-reviewer`, `privacy-compliance-reviewer`) — in
   parallel, each scoped to the same subject.
3. Merge the results into one report for the user: verdict
   (SHIP / SHIP WITH CHANGES / HOLD), deduplicated numbered findings with
   file:line and fixes, and any attorney-escalation items.

Do not apply fixes automatically — report first; fix only when the user
asks.
