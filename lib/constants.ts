/** Kept in sync with ARCHIVE_MARKERS in contracts/knockoff_bounty.py. */
export const ARCHIVE_HOSTS = [
  "web.archive.org/web/",
  "archive.ph/",
  "archive.today/",
  "archive.is/",
  "archive.li/",
  "archive.vn/",
  "timetravel.mementoweb.org/",
];

export const VERDICT_COPY: Record<string, { title: string; blurb: string }> = {
  COPY: {
    title: "Copy",
    blurb: "The listing reproduces the registered design. The bounty is released to the reporter.",
  },
  DERIVATIVE: {
    title: "Derivative",
    blurb: "Substantial borrowing, short of reproduction. A reduced share of the bounty is released.",
  },
  INDEPENDENT: {
    title: "Independent",
    blurb: "Not a copy. The reporter's stake moves to the design's pool to cover the adjudication.",
  },
  INSUFFICIENT_EVIDENCE: {
    title: "Insufficient evidence",
    blurb: "The snapshot held no readable listing. No penalty, stake returned, file again with a better capture.",
  },
  PENDING: {
    title: "Pending",
    blurb: "Filed and escrowed. Waiting for anyone to push it through the court.",
  },
};

export const STEPS = [
  {
    n: "01",
    title: "Register",
    body:
      "A designer writes down what the work actually is and escrows a bounty. The chain timestamps it. That timestamp is the prior-art proof a marketplace complaint can never produce on its own.",
  },
  {
    n: "02",
    title: "Report",
    body:
      "Anyone who spots the knockoff files a claim with an archive snapshot and a stake. Live marketplace URLs are refused: they are mutable, geo-targeted and editable by the seller under review.",
  },
  {
    n: "03",
    title: "Adjudicate",
    body:
      "Validators independently fetch the same snapshot, rate the same four factors against the same published rubric, and must agree before anything settles. No single model decides.",
  },
  {
    n: "04",
    title: "Settle",
    body:
      "The contract derives the verdict from the ratings in plain Python, moves the money, and leaves a public evidence pack with a transaction hash you can attach to a takedown.",
  },
];

export const SAMPLE_EVIDENCE =
  "https://web.archive.org/web/20240101000000/https://www.aliexpress.com/w/wholesale-cat-sticker.html";
