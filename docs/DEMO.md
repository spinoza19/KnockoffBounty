# Demo video script

A demo video is mandatory for the Agent Tank hackathon. Target **90 seconds**. The single thing a
viewer must come away with: *the verdict was not produced by one model that could have said anything
— several independent validators had to reach the same one, and there is a receipt.*

Record at 1440×900 or larger. Append `?motion=off` to the URL if you would rather skip the entrance
animations while recording.

---

## 0:00 – 0:15 · The problem, shown not told

Two browser windows side by side:

- left: an independent designer's listing
- right: the archived AliExpress page — <https://web.archive.org/web/20240101000000/https://www.aliexpress.com/w/wholesale-cat-sticker.html>
  — scrolled to **"Popular Ancient Lamp Cats and Birds Wall Sticker"**, which several different
  storefronts on that one page are selling.

Say: *"This design is being resold by four different stores. The designer files an IP complaint, and
it gets refused — because a complaint is just an assertion, and the only party who can rule on it is
the marketplace that takes a cut of every sale."*

Do not add music. The two screenshots are the argument.

## 0:15 – 0:30 · Register

Open the app, connect MetaMask, hit **Register a design**. The description is already the interesting
part — read one line of it aloud.

Say: *"The designer writes down what the work actually is and escrows a bounty. The chain timestamps
it. That timestamp is the one thing a marketplace complaint can never produce on its own."*

## 0:30 – 0:45 · Report

**Report a copy** on "Ancient Lamp, Cats & Birds". Paste a live AliExpress URL first — the form
refuses it. Then paste the archive link, which turns green.

Say: *"Evidence has to be a frozen capture. Validators each re-fetch it independently, minutes apart.
A live marketplace page is geo-targeted, bot-blocked and editable by the seller under review — two
honest validators would read two different pages and never agree."*

That five-second refusal is worth more than any slide about determinism.

## 0:45 – 1:10 · The court — the moment that matters

Hit **Adjudicate** and let the transaction panel run. Do not cut away; let it breathe.

Say: *"Now every validator fetches that same snapshot, rates the same four factors against a rubric
published in the contract, and the contract adds the score in plain Python. The model never picks the
verdict — it only rates the factors. The round settles only if their derived verdicts match."*

Verdict lands: **COPY, 9 out of 12.**

## 1:10 – 1:25 · The receipt

Open the evidence pack. Scroll the factor table. Point at the payout.

Say: *"This is what the designer actually wanted. Prior art they did not timestamp themselves, a
capture of the listing that survives its removal, and a reasoned ruling from parties with no stake in
either side — every line of it re-checkable on the explorer."*

## 1:25 – 1:30 · The negative case

Cut to claim **C2** in the docket: the *same* snapshot, judged against "Sleeping Fox in a Teacup",
came back **INDEPENDENT, 0/12**.

Say: *"Same evidence, different design, opposite verdict. A court that only ever rules one way isn't
a court."*

End on the explorer link.

---

## Recording checklist

- [ ] MetaMask is on GenLayer Studio Next (chain 61997) and the account is funded
- [ ] `NEXT_PUBLIC_CONTRACT_ADDRESS` points at the deployed contract
- [ ] The archive snapshot is open in a tab before you start — it is slow to load
- [ ] Toggle to **Paper** (light) once during the video; it reads well on a projector
- [ ] Do not show the private key, `.env.local`, or the terminal

## Things worth saying if you have spare seconds

- Withdrawals settle on finalization, deliberately — a payout that an appeal could unwind is worse
  than one that takes a while.
- A dismissed claim costs the reporter their stake. Accusations are not free.
- Anyone can pay to push a pending claim through the court; the outcome does not depend on who asks.
