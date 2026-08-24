# SSi Q1 2026 Execution Plan

**Quarter:** Q1 2026 (January 1 - March 31)
**Version:** 1.0
**Date:** 2025-12-15
**Status:** DRAFT - Ready for execution

---

## Q1 Mission

**Launch the foundation of the Big 10 matrix with 30 high-demand language courses while proving our go-to-market strategy and achieving £70k-£90k MRR.**

---

## Production Schedule

### January 2026: Spanish & English Families (10 courses)

**Week 1 (Jan 1-5): Spanish Anchor**
- [ ] Generate `spa_for_eng` (250 seeds)
  - Phase 1: Translation + LEGO extraction
  - Phase 2: Conflict resolution
  - Phase 3: Basket generation
  - Phase 8: Audio generation (Azure TTS Spanish voices)
  - Phase 9: Manifest compilation
- [ ] QA review: Validate all phases
- [ ] Deploy to production (S3 + Supabase)

**Week 2 (Jan 6-12): Spanish Family Variants**
- [ ] Generate Spanish family (audio reuse - 40% cost savings):
  - `spa_for_fra` (Spanish for French speakers)
  - `spa_for_deu` (Spanish for German speakers)
  - `spa_for_ita` (Spanish for Italian speakers)
  - `spa_for_por` (Spanish for Portuguese speakers)
- [ ] Audio generation: Reuse target (Spanish) audio, generate new source audio
- [ ] QA review: All 4 variants
- [ ] Deploy to production

**Week 3 (Jan 13-19): English Anchor**
- [ ] Generate `eng_for_spa` (250 seeds)
- [ ] Audio generation (Azure TTS English voices)
- [ ] QA review
- [ ] Deploy to production

**Week 4 (Jan 20-26): English Family Variants**
- [ ] Generate English family (audio reuse):
  - `eng_for_fra`
  - `eng_for_deu`
  - `eng_for_ita`
  - `eng_for_por`
- [ ] Audio generation: Reuse English audio, generate source audio
- [ ] QA review: All 4 variants
- [ ] Deploy to production

**Week 5 (Jan 27-31): Buffer & Marketing Launch**
- [ ] Bug fixes from user feedback
- [ ] UX improvements
- [ ] Marketing: Launch campaign begins
- [ ] Press release: "10 Courses Live"

**January Deliverables:** 10 courses (Spanish family: 5, English family: 5)

---

### February 2026: French & Mandarin Families (10 courses)

**Week 1 (Feb 1-9): French Family**
- [ ] Generate `fra_for_eng` (anchor)
- [ ] Generate French family variants:
  - `fra_for_spa`
  - `fra_for_deu`
  - `fra_for_ita`
  - `fra_for_por`
- [ ] Audio generation (Azure TTS French voices)
- [ ] QA review
- [ ] Deploy to production

**Week 2 (Feb 10-16): Mandarin Chinese Family**
- [ ] Generate `cmn_for_eng` (anchor)
- [ ] Generate Chinese family variants:
  - `cmn_for_spa`
  - `cmn_for_fra`
  - `cmn_for_deu`
  - `cmn_for_jpn` (pre-release for Japanese family in April)
- [ ] Audio generation (Azure TTS Mandarin voices)
- [ ] QA review
- [ ] Deploy to production

**Week 3 (Feb 17-23): QA & Optimization**
- [ ] Comprehensive QA: All 20 courses (Jan + Feb)
- [ ] Fix any bugs or issues
- [ ] Performance optimization (CDN, caching)
- [ ] User feedback review and prioritization

**Week 4 (Feb 24-28): Buffer & Marketing Push**
- [ ] Final polish
- [ ] Marketing: YouTuber reviews go live
- [ ] Press release: "20 Courses Live"
- [ ] Product Hunt soft launch

**February Deliverables:** 10 courses (French family: 5, Chinese family: 5)

---

### March 2026: German & Italian Families (10 courses)

**Week 1 (Mar 1-9): German Family**
- [ ] Generate `deu_for_eng` (anchor)
- [ ] Generate German family variants:
  - `deu_for_spa`
  - `deu_for_fra`
  - `deu_for_ita`
  - `deu_for_por`
- [ ] Audio generation (Azure TTS German voices)
- [ ] QA review
- [ ] Deploy to production

**Week 2 (Mar 10-16): Italian Family**
- [ ] Generate `ita_for_eng` (anchor)
- [ ] Generate Italian family variants:
  - `ita_for_spa`
  - `ita_for_fra`
  - `ita_for_deu`
  - `ita_for_por`
- [ ] Audio generation (Azure TTS Italian voices)
- [ ] QA review
- [ ] Deploy to production

**Week 3 (Mar 17-23): Comprehensive QA**
- [ ] Full regression testing: All 30 courses
- [ ] User acceptance testing (beta users)
- [ ] Performance benchmarking
- [ ] Analytics review (usage patterns, completion rates)

**Week 4 (Mar 24-31): Q1 Wrap-Up & Q2 Planning**
- [ ] Q1 retrospective (what worked, what didn't)
- [ ] Q2 course production planning
- [ ] Marketing: Q1 results blog post
- [ ] Press release: "30 Courses Live - Big 10 Matrix 30% Complete"

**March Deliverables:** 10 courses (German family: 5, Italian family: 5)

---

## Marketing Plan (Q1 Detail)

### Pre-Launch (Dec 2025)

**Goals:**
- Build anticipation
- Secure early adopters
- Establish partnerships

**Actions:**
- [ ] Launch "Founding Member" campaign (early access + lifetime pricing)
- [ ] Secure first 5 YouTuber partnerships (polyglot channels, 100k+ subs)
- [ ] Email Welsh community: "Big news coming in January"
- [ ] Social media teasers: "The LEGO Method goes global"

**Budget:** £500 (YouTuber product seeding)

---

### January Launch

**Week 1-2: Soft Launch**
- [ ] Email to Welsh community (60,000 users):
  - Subject: "Spanish, French, German... The LEGO Method Goes Global"
  - Offer: 20% lifetime discount for first 1,000 customers
  - CTA: "Start Learning Today"
- [ ] Blog post: "Why the LEGO Method Works" (neuroscience-backed)
- [ ] Social media: Daily language tips, LEGO demonstrations
- [ ] Reddit AMA: r/languagelearning, r/Spanish (announce new method)

**Week 3-4: Public Launch**
- [ ] Press release: "AI-Powered Language Learning with LEGO Method Launches 10 Courses"
  - Target: TechCrunch, The Verge, Hacker News, Product Hunt
- [ ] YouTuber reviews go live (first 2-3 partners)
- [ ] Paid ads begin (small budget test):
  - Google Ads: "Learn Spanish online" (£200/week)
  - Facebook: Language learning interest targeting (£200/week)
- [ ] Email campaign: 7-day Spanish challenge (free, with upsell to paid)

**Budget:** £2,000 (ads + PR distribution)

---

### February Expansion

**Week 1-2: Content Marketing**
- [ ] Blog series: "From Zero to Conversational in 90 Days"
  - Week 1: "The Science of Spaced Repetition"
  - Week 2: "Why LEGOs Beat Flashcards"
  - Week 3: "The Any-to-Any Advantage"
  - Week 4: "Case Study: Welsh Success Story"
- [ ] YouTube: "Learn Your First 50 Spanish Words in 1 Hour" (lead magnet)
- [ ] Podcast appearances: Polyglot podcast, language learning shows (3-5 appearances)

**Week 3-4: Social Proof**
- [ ] User testimonial campaign (collect + publish)
- [ ] Case studies: Early adopter success stories
- [ ] Social media: User-generated content (progress screenshots)
- [ ] Product Hunt launch (official, target Top 5 of day)

**Budget:** £1,500 (ads + podcast sponsorships)

---

### March Optimization

**Week 1-2: B2B Outreach**
- [ ] Corporate pilot program: Approach 10 companies
  - Target: Tech companies with global teams
  - Offer: 3-month free trial for 50 employees
  - Goal: 2 signed pilots
- [ ] University partnerships: Language departments
  - Target: 20 universities
  - Offer: Free institutional access for one semester
  - Goal: 5 partnerships

**Week 3-4: Community Building**
- [ ] Launch SSi community platform (forums, study groups)
- [ ] Language activist outreach: First 5 partnerships
  - Target: Irish, Scottish Gaelic, Basque, Catalan, Māori
  - Offer: Free course production + hosting
- [ ] User meetups: Virtual polyglot gatherings

**Budget:** £1,000 (community platform, B2B materials)

---

## Revenue Strategy (Q1)

### Pricing (Launch Pricing)

**Individual Tiers:**
- Standard: £7.99/month (20% off £9.99) - First 1,000 customers only
- Polyglot Pass: £23.99/month (20% off £29.99) - First 1,000 customers only
- Annual: Additional 17% off (e.g., Standard Annual: £79 vs £96 monthly)

**Corporate:**
- Pilot program: Free for 3 months (up to 50 seats)
- Post-pilot: £5/user/month (annual contract)

**Messaging:**
- "Founding Member" badge (lock in Q1 pricing forever)
- "Support language preservation" (free tier funded by paid users)
- "Money-back guarantee" (30 days, no questions asked)

---

### Conversion Funnel

**Top of Funnel (Awareness):**
- Blog posts (SEO)
- Social media (organic + paid)
- YouTuber reviews
- PR coverage
- Podcast appearances

**Middle of Funnel (Consideration):**
- 7-day free trial (all tiers)
- Free Spanish challenge (email course)
- Case studies and testimonials
- Interactive demo (try first lesson free)

**Bottom of Funnel (Conversion):**
- Founding Member discount (urgency: first 1,000 only)
- Annual subscription discount (save 17%)
- Money-back guarantee (reduce risk)
- Email remarketing (abandoned trials)

**Retention:**
- Onboarding email sequence (7 days)
- Progress tracking and gamification
- Community features (forums, leaderboards)
- Re-engagement campaigns (lapsed users)

---

### Revenue Targets (Q1)

**January:**
- Welsh community conversion: 1,200 paid users (2% of 60,000)
  - 800 Standard (£7.99/mo) = £6,392
  - 300 Polyglot Pass (£23.99/mo) = £7,197
  - 100 Annual (£79) = £7,900 one-time
- New users: 200 paid (from marketing)
  - ARPU: £10/mo = £2,000
- **Total January MRR:** £60k (baseline) + £15.6k (new) = £75.6k
- **One-time:** £7.9k (annual subscriptions)

**February:**
- Welsh conversion: +300 paid users (cumulative 1,500)
- New users: +500 paid (from marketing ramp-up)
- Churn: -5% (75 users, offset by growth)
- **Total February MRR:** £60k + £22k = £82k

**March:**
- Welsh conversion: +200 paid users (cumulative 1,700)
- New users: +800 paid (from YouTuber reviews, PR, Product Hunt)
- Churn: -4% (improving onboarding)
- **Total March MRR:** £60k + £30k = £90k

**Q1 Totals:**
- **MRR by March 31:** £90k (1.5x growth from £60k baseline)
- **New paid users:** 2,500
- **Annual subscriptions:** £25k one-time revenue

**Notes:**
- Conservative estimates above
- Assumes 2-5% Welsh community conversion (low end)
- Assumes modest new user acquisition (500-800/month)
- Real results may exceed if marketing resonates

---

## Key Performance Indicators (KPIs)

### Product Metrics

- [ ] **Courses live:** 30 by March 31
- [ ] **Audio coverage:** 100% (all samples in Supabase MAR)
- [ ] **Course completion rate:** >40% by March 31
- [ ] **App rating:** 4.5+ stars (iOS/Android)
- [ ] **Page load time:** <2 seconds (PWA)
- [ ] **Audio playback latency:** <500ms

---

### User Metrics

- [ ] **Total active learners:** 70,000 by March 31 (up from 60,000)
- [ ] **Paid subscribers:** 2,500+ new (cumulative with baseline)
- [ ] **Free tier users:** 10,000 (Welsh + trial users)
- [ ] **Daily active users (DAU):** 5,000+
- [ ] **Monthly active users (MAU):** 25,000+
- [ ] **DAU/MAU ratio:** 20%+ (engagement)

---

### Revenue Metrics

- [ ] **MRR by March 31:** £70k-£90k (conservative to moderate)
- [ ] **Average revenue per user (ARPU):** £10-£12/month
- [ ] **Customer acquisition cost (CAC):** <£20
- [ ] **Lifetime value (LTV):** >£200 (20+ months retention)
- [ ] **LTV:CAC ratio:** >10:1
- [ ] **Churn rate:** <5%/month

---

### Marketing Metrics

- [ ] **Email subscribers:** 1,000+ by March 31
- [ ] **Social media followers:** 2,000+ (Twitter/X, Instagram combined)
- [ ] **Blog traffic:** 10,000 monthly visitors
- [ ] **YouTuber partnerships:** 5 secured, 3+ reviews published
- [ ] **Press mentions:** 3+ major tech publications
- [ ] **Product Hunt rank:** Top 5 of the day
- [ ] **Corporate pilots:** 2+ signed

---

## Team & Resources

### Core Team (Existing)

- **Tom Cassidy:** Founder, product vision, technical oversight
- **Automation Pipeline:** APML v11.0 (Phase 1-3, 8, 9 servers)
- **Infrastructure:** Supabase (MAR), S3 (storage), Vercel (hosting)

### Q1 Additions (If Budget Allows)

- **Marketing Lead (Part-time or Contractor):** £2-3k/month
  - Responsibilities: Content creation, social media, email campaigns, partnerships
  - Nice-to-have: Can start with founder-led marketing + freelancers

- **Customer Support (Part-time):** £1k/month
  - Responsibilities: Email support, community moderation, user onboarding
  - Alternative: Founder-led until scale requires dedicated support

- **QA Tester (Contractor):** £500/month
  - Responsibilities: Course testing, bug reporting, UX feedback
  - Alternative: Beta user program (incentivized with free subscriptions)

**Total Q1 Hiring Budget:** £0-£4.5k/month (flexible based on revenue)

---

### External Resources

**Freelancers:**
- Blog writer: £100/post (4 posts/month) = £400/month
- Social media manager: £500/month
- Graphic designer: £300/month (ad creatives, social assets)

**Services:**
- Email marketing (Mailchimp/Sendgrid): £50/month
- Analytics (Mixpanel/Amplitude): £100/month
- Customer support (Intercom/Zendesk): £50/month
- Community platform (Discourse/Circle): £100/month

**Total External Budget:** £1,500/month

---

## Budget Summary (Q1)

### Production (Fixed)

- Course production: £1,000/month × 3 = £3,000
- Infrastructure (Supabase, S3, Vercel): £300/month × 3 = £900
- **Total Production:** £3,900

### Marketing (Variable)

- January: £2,500 (launch campaign)
- February: £1,500 (content + ads)
- March: £1,000 (optimization)
- **Total Marketing:** £5,000

### Team (Optional)

- Marketing lead: £0-£9,000 (£0-£3k/month × 3)
- Customer support: £0-£3,000
- QA tester: £0-£1,500
- **Total Team:** £0-£13,500

### External Resources

- Freelancers + services: £1,500/month × 3 = £4,500
- **Total External:** £4,500

### Grand Total (Q1)

- **Minimum (no hires):** £13,400
- **Maximum (all hires):** £26,900

**Funding:** Use existing revenue (£60k/month baseline) + new revenue (grows from £0 to £30k in Q1)

---

## Risk Management (Q1 Specific)

### Technical Risks

**Risk:** Pipeline fails during high-volume production (30 courses in 90 days)
- **Mitigation:**
  - Test pipeline with 5-10 course batch in December 2025
  - Build in buffer weeks (Week 5 of each month)
  - Have manual backup process documented
  - Monitor automation server logs daily

**Risk:** Audio quality issues (TTS voices don't meet standards)
- **Mitigation:**
  - QA every course before release
  - Have 2-3 voice options per language (Azure + ElevenLabs)
  - Budget for audio re-generation if needed
  - Collect user feedback and iterate

**Risk:** Infrastructure can't handle user growth
- **Mitigation:**
  - Load testing before launch (simulate 10k concurrent users)
  - CDN caching for audio files (reduce S3 costs)
  - Supabase connection pooling
  - Monitor costs weekly, scale as needed

---

### Marketing Risks

**Risk:** Low conversion from free to paid (Welsh users don't convert)
- **Mitigation:**
  - A/B test messaging (different value props)
  - Extend free trial from 7 to 14 days if needed
  - Offer special "Welsh community" discount (additional 10% off)
  - Focus on annual subscriptions (upfront commitment)

**Risk:** YouTuber partnerships fall through
- **Mitigation:**
  - Over-recruit: Reach out to 20 YouTubers, goal is 5
  - Offer generous terms (free lifetime access, affiliate revenue share)
  - Have backup plan: Micro-influencers (10k-50k subs) + more of them

**Risk:** PR doesn't land (no major media coverage)
- **Mitigation:**
  - Hire PR agency (£2k one-time) if founder-led PR fails
  - Focus on niche media first (language learning blogs, polyglot communities)
  - User success stories as backup (social proof instead of media proof)

---

### Financial Risks

**Risk:** Costs exceed budget (production or marketing overspend)
- **Mitigation:**
  - Fixed monthly production budget (£1k - non-negotiable)
  - Marketing budget tied to revenue (only spend new revenue, not baseline)
  - Daily cost monitoring (Supabase, S3, ads)
  - Kill underperforming ad campaigns within 48 hours

**Risk:** Revenue growth slower than projected
- **Mitigation:**
  - Conservative scenario still achieves £70k MRR (only £10k growth needed)
  - Focus on annual subscriptions (upfront cash, reduces monthly pressure)
  - Have flexible pricing: Can discount if needed to hit volume targets
  - B2B pilots can offset: Even 1 corporate deal = £2.5k MRR

---

## Success Criteria (Q1)

### Must-Have (Non-negotiable)

- [ ] 30 courses live by March 31
- [ ] 100% audio coverage (no missing samples)
- [ ] Zero critical bugs (app doesn't crash, payments work)
- [ ] £70k MRR by March 31 (minimum growth target)

### Should-Have (Important but flexible)

- [ ] 2,500+ new paid users
- [ ] 40% course completion rate
- [ ] 3+ YouTuber reviews published
- [ ] 2+ corporate pilot programs started

### Nice-to-Have (Bonus)

- [ ] £90k MRR (aggressive target)
- [ ] Product Hunt Top 5
- [ ] Major media feature (TechCrunch, Verge, etc.)
- [ ] 5+ university partnerships

---

## Weekly Cadence

### Monday: Planning
- Review last week's metrics (MRR, users, completion rate, costs)
- Set this week's priorities (production + marketing)
- Standup: What's blocking progress?

### Wednesday: Mid-week Check-in
- Course production status (on track for monthly goal?)
- Marketing campaign performance (ads, email, social)
- User feedback review (support tickets, reviews, social mentions)

### Friday: Retrospective
- What shipped this week?
- What didn't ship (and why)?
- Lessons learned
- Next week's plan

### Monthly: Strategic Review
- Full metrics dashboard review
- Budget vs. actual spend
- Revenue vs. target
- Adjust Q1 plan if needed (pivot or double-down)

---

## Next Steps (Immediate Actions - December 2025)

**Week of Dec 16-22:**
- [ ] Stakeholder review of this plan (approve/modify)
- [ ] Finalize Q1 course list (confirm language priorities)
- [ ] Test production pipeline (generate 1-2 test courses end-to-end)
- [ ] Reach out to first 10 YouTubers (polyglot channels)

**Week of Dec 23-29:**
- [ ] Set up marketing infrastructure (email, social, analytics)
- [ ] Design launch creatives (ads, social posts, email templates)
- [ ] Write blog posts (schedule for January)
- [ ] Test payment flow (Stripe integration, subscription logic)

**Week of Dec 30-Jan 5:**
- [ ] Founding Member campaign launch (email Welsh community)
- [ ] Social media teasers (build anticipation)
- [ ] Final production pipeline test (fix any bugs)
- [ ] Launch week prep (all hands on deck)

---

## Conclusion

Q1 2026 is the foundation quarter. We're not just launching 30 courses - we're proving that:

1. **The LEGO method scales** beyond Welsh to global languages
2. **Automated production works** at volume (30 courses in 90 days)
3. **The market wants this** (free-to-paid conversion, new user acquisition)
4. **We can execute** (product + marketing + revenue)

If we hit our conservative target (£70k MRR), we've validated the model and can confidently scale in Q2-Q4.

If we hit our aggressive target (£90k MRR), we're on pace for £2.76M ARR by year-end and can accelerate hiring and expansion.

Either way, Q1 sets the stage for a transformational 2026.

**Let's build this.**

---

**Document Control:**
- Version: 1.0
- Status: DRAFT - Ready for execution
- Review Required: Tom Cassidy, SSi Leadership
- Next Update: Weekly during Q1 (living document)
- Related Docs:
  - SSI_2026_MARKETING_PLAN_AND_RELEASE_SCHEDULE.md (full year plan)
  - SSI_2026_EXECUTIVE_SUMMARY.md (high-level overview)
