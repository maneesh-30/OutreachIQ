# Prospect pool

`pool.json` is the seed universe the **prospector** scores against OUR ICP during
discovery. Each entry:

```json
{
  "name":   "Company name",
  "domain": "example.com",
  "blurb":  "1-2 sentence description: industry, size, stage, growth motion"
}
```

The pool deliberately mixes:
- **Good fits** — mid-market, product-led B2B SaaS (e.g. Height, Cal.com, Linear).
- **Anti-fits** — services firms, enterprise giants, and non-software businesses
  (e.g. McKinsey, Walmart, Joe's Pizza) so ranking quality is visible.

In Phase 6 this static pool is replaced by **live Apify discovery**, with the pool
kept as a fallback when live search fails.
