# SSi 2026 Marketing Plan & Release Schedule

**Document Version:** 1.0
**Created:** 2025-12-15
**Author:** Strategic Planning (Claude)
**Status:** DRAFT - Requires stakeholder review

---

## Executive Summary

This document outlines a comprehensive go-to-market strategy for SSi language courses in 2026, leveraging our automated content pipeline to launch the Big 10 language matrix (100 course pairs) while maintaining sustainable production capacity and revenue growth.

**Key Metrics:**
- **Production capacity:** 25-30 standard courses (250 seeds) per month at current £1000/month budget
- **Target:** Complete Big 10 matrix (100 courses) by Q4 2026
- **Revenue model:** Paid courses for Big 10 languages, free community courses
- **Current baseline:** £60k/month (£30k subscribers + £30k government contracts)

---

## Table of Contents

1. [Production Economics](#production-economics)
2. [2026 Release Schedule](#2026-release-schedule)
3. [Marketing Strategy](#marketing-strategy)
4. [Revenue Projections](#revenue-projections)
5. [Milestones & KPIs](#milestones--kpis)
6. [Risk Mitigation](#risk-mitigation)
7. [Community & Language Activist Strategy](#community--language-activist-strategy)

---

## Production Economics

### Current Capabilities

**Monthly Budget:** £1000
**Production Rates:**
- Full courses (668 seeds): 12-15/month
- Standard courses (250 seeds): 25-30/month
- Variants (audio reuse): ~40% of first course cost

**Audio Reuse Strategy:**
Example: "Spanish for X speakers" family
- `spa_for_eng`: Full cost (~$5 TTS for 250 seeds)
- `spa_for_fra`, `spa_for_deu`, etc.: ~$2 each (reuse Spanish audio)
- **Complete language family (10 courses):** ~$23 TTS + 18% monthly Claude capacity

**Technical Infrastructure:**
- APML v13 pipeline (Translation → LEGO Extraction → Basket Generation → Audio → Manifest)
- Supabase audio registry with flat course_audio table
- Course-owned audio architecture for simplicity
- S3 flat storage ({uuid}.mp3) + CDN delivery

### Course Size Strategy

**Phase 1-2 (Q1-Q2):** Launch with 250-seed courses
- Faster time-to-market (3-4 months for Big 10 matrix)
- Lower audio costs
- Proves methodology and market demand
- Generates revenue faster

**Phase 3-4 (Q3-Q4):** Upgrade to 668-seed "premium" courses
- Charged upgrade or separate SKU
- Leverages existing audio (40% cost reduction)
- Positioned as "complete mastery" tier
- Uses established brand trust

---

## 2026 Release Schedule

### Q1 2026: Foundation Launch (Jan-Mar)

**Theme:** "The Big 3" - Highest demand languages

**Course Releases:**

**January (10 courses)**
- Spanish family (5 courses):
  - `spa_for_eng` (anchor course)
  - `spa_for_fra`, `spa_for_deu`, `spa_for_ita`, `spa_for_por`
- English family (5 courses):
  - `eng_for_spa` (anchor course)
  - `eng_for_fra`, `eng_for_deu`, `eng_for_ita`, `eng_for_por`

**February (10 courses)**
- French family (5 courses):
  - `fra_for_eng` (anchor course)
  - `fra_for_spa`, `fra_for_deu`, `fra_for_ita`, `fra_for_por`
- Mandarin Chinese family (5 courses):
  - `cmn_for_eng` (anchor course)
  - `cmn_for_spa`, `cmn_for_fra`, `cmn_for_deu`, `cmn_for_jpn`

**March (10 courses)**
- German family (5 courses):
  - `deu_for_eng` (anchor course)
  - `deu_for_spa`, `deu_for_fra`, `deu_for_ita`, `deu_for_por`
- Italian family (5 courses):
  - `ita_for_eng` (anchor course)
  - `ita_for_spa`, `ita_for_fra`, `ita_for_deu`, `ita_for_por`

**Q1 Deliverables:** 30 courses (30% of Big 10 matrix)

**Marketing Focus:**
- Launch campaign: "The LEGO Method - Learn Any Language"
- Welsh community testimonials and case studies
- Early adopter pricing (20% discount for first 3 months)
- PR push: "Revolutionary AI-Powered Language Learning"

**Revenue Target:**
- Conservative: +£10k/month (£70k total)
- Moderate: +£20k/month (£80k total)
- Aggressive: +£30k/month (£90k total)

---

### Q2 2026: Expansion (Apr-Jun)

**Theme:** "East Meets West" - Asian & European languages

**Course Releases:**

**April (10 courses)**
- Portuguese family (5 courses):
  - `por_for_eng` (anchor course)
  - `por_for_spa`, `por_for_fra`, `por_for_ita`, `por_for_deu`
- Japanese family (5 courses):
  - `jpn_for_eng` (anchor course)
  - `jpn_for_cmn`, `jpn_for_spa`, `jpn_for_fra`, `jpn_for_deu`

**May (10 courses)**
- Korean family (5 courses):
  - `kor_for_eng` (anchor course)
  - `kor_for_cmn`, `kor_for_jpn`, `kor_for_spa`, `kor_for_fra`
- Arabic family (5 courses):
  - `ara_for_eng` (anchor course)
  - `ara_for_fra`, `ara_for_spa`, `ara_for_deu`, `ara_for_ita`

**June (10 courses)**
- Complete remaining pairs (mop-up month)
  - Cross-language pairs not yet covered
  - High-demand combinations: `cmn_for_kor`, `jpn_for_kor`, `ara_for_cmn`, etc.
  - Strategic pairs based on Q1-Q2 market data

**Q2 Deliverables:** 30 courses (60% of Big 10 matrix total)

**Marketing Focus:**
- Case study campaign: "From Zero to Conversational in 90 Days"
- Influencer partnerships (language learning YouTubers)
- Corporate pilot programs (B2B entry)
- App Store feature push (if PWA ready)

**Revenue Target:**
- Conservative: +£15k/month (£85k total by June)
- Moderate: +£30k/month (£100k total by June)
- Aggressive: +£50k/month (£120k total by June)

---

### Q3 2026: Completion & Optimization (Jul-Sep)

**Theme:** "The Complete Matrix" - Launch final courses + premium upgrades

**Course Releases:**

**July (10 courses)**
- Complete final Big 10 pairs
- Focus on under-served combinations
- Market-driven priority (e.g., if `ara_for_cmn` shows demand, prioritize)

**August (15 courses)**
- Begin 668-seed "Premium" upgrades for top performers
- Start with: `spa_for_eng`, `eng_for_spa`, `fra_for_eng`, `cmn_for_eng`, `deu_for_eng`
- Audio reuse makes this economical (40% cost savings)

**September (15 courses)**
- Continue Premium upgrades
- Launch "SSi Complete" subscription tier (all 250-seed + Premium courses)
- Begin community course support (free tier activation)

**Q3 Deliverables:**
- 40 new courses/upgrades
- 100% Big 10 matrix coverage (250-seed)
- 15-20 Premium (668-seed) courses

**Marketing Focus:**
- "Mission Accomplished" campaign - 100 course pairs live
- Premium tier positioning: "Deep Fluency Path"
- B2B expansion: schools, corporations, government
- Community course platform beta (language activists)

**Revenue Target:**
- Conservative: +£20k/month (£105k total by Sep)
- Moderate: +£40k/month (£130k total by Sep)
- Aggressive: +£70k/month (£160k total by Sep)

---

### Q4 2026: Scale & Community (Oct-Dec)

**Theme:** "Language for Everyone" - Community courses + optimization

**Course Releases:**

**October (20 courses)**
- Premium upgrades (668-seed) for mid-tier performers
- First community courses launched (partner with language activists)
  - Welsh for speakers of Big 10 languages (leverage existing content)
  - Irish (`gle`), Macedonian (`mkd`), regional languages

**November (20 courses)**
- Continue Premium upgrades
- Community course acceleration
- Regional variants (e.g., `spa_MX_for_eng` vs `spa_ES_for_eng`)

**December (10 courses)**
- Final Premium upgrades
- Holiday marketing push
- Annual subscription campaign

**Q4 Deliverables:**
- 50 new courses/upgrades
- 30-50 Premium (668-seed) courses total
- 10-20 community courses live

**Marketing Focus:**
- Year-end review: "2026 - The Year SSi Changed Language Learning"
- Community stories: Language activists and endangered languages
- Corporate case studies
- 2027 roadmap preview

**Revenue Target:**
- Conservative: +£30k/month (£135k total by Dec)
- Moderate: +£60k/month (£190k total by Dec)
- Aggressive: +£100k/month (£230k total by Dec)

---

## Marketing Strategy

### Core Value Propositions

**1. The LEGO Method**
- "Learn language like building with LEGOs - recombine what you know"
- Visual metaphor: Show LEGO bricks assembling into complex structures
- Proven by Welsh success (largest online Welsh community)

**2. AI-Powered Personalization**
- "668 seeds, carefully ordered for maximum retention"
- Spaced repetition meets pedagogical science
- "Your brain learns by pattern recognition - we've done the work"

**3. Any Language, Any Direction**
- "Learn Spanish from French, German, Italian... not just English"
- Unique positioning in market (most competitors are English-only)
- "Already bilingual? Use what you know to learn faster"

**4. Community-Driven**
- Free courses for endangered/minority languages
- Partnership with language activists
- "Every language deserves to thrive"

### Marketing Channels

**Q1-Q2: Foundation Building**

1. **Content Marketing**
   - Blog: "Why the LEGO Method Works" (neuroscience-backed)
   - Case studies: Welsh learner success stories
   - YouTube: "Learn Your First 50 Words in Spanish in 1 Hour"
   - Podcast appearances: Polyglot podcasts, language learning shows

2. **Social Media**
   - Twitter/X: Daily language tips, LEGO method demonstrations
   - Instagram: Visual before/after learner journeys
   - TikTok: Quick "learn a phrase in 60 seconds" hooks
   - Reddit: r/languagelearning, r/Spanish, r/French AMAs

3. **Email Marketing**
   - Existing Welsh community: "New languages launching!"
   - Drip campaigns: Free 7-day Spanish challenge
   - Referral program: "Invite 3 friends, get 1 month free"

4. **Partnerships**
   - Language learning YouTubers (100k+ subs): Free premium access for review
   - Polyglot conference sponsorships
   - University language departments: Free institutional access (marketing funnel)

**Q3-Q4: Scale & Diversification**

5. **B2B Marketing**
   - Corporate L&D programs: "Global workforce, local languages"
   - Schools: "Supplement classroom learning with SSi"
   - Government contracts: Replicate Welsh success with other regional languages

6. **Paid Acquisition**
   - Google Ads: "Learn Spanish online" (high-intent keywords)
   - Facebook/Instagram: Interest targeting (travel, expats, language enthusiasts)
   - YouTube pre-roll: Target language learning channels
   - Podcast sponsorships: Language learning, travel, productivity shows

7. **PR & Media**
   - Press releases: "AI Revolutionizes Language Learning with LEGO Method"
   - Tech publications: Hacker News, Product Hunt launches
   - Mainstream media: "This App Teaches You Spanish Using LEGOs"
   - Academic partnerships: Research papers on LEGO methodology

8. **Community Activation**
   - Language activist grants: Free course production for endangered languages
   - User-generated content: Learner testimonials, progress videos
   - Ambassador program: Top users become brand advocates
   - In-person events: Polyglot gatherings, language exchanges

### Pricing Strategy

**Tier 1: Free (Community Courses)**
- Welsh and other minority languages
- 250-seed courses
- Supported by paid tier revenue
- Marketing funnel: Free users upgrade to paid for other languages

**Tier 2: Standard (£9.99/month or £99/year)**
- Access to one Big 10 language pair (250 seeds)
- E.g., "Spanish for English speakers"
- Annual discount: Save 17%

**Tier 3: Premium Language (£14.99/month or £149/year)**
- Access to one Big 10 language pair (668 seeds - Premium)
- Deeper mastery, more practice
- Annual discount: Save 17%

**Tier 4: Polyglot Pass (£29.99/month or £299/year)**
- Unlimited access to ALL Big 10 courses (250-seed)
- Best value for multi-language learners
- Annual discount: Save 17%

**Tier 5: Complete Access (£49.99/month or £499/year)**
- Unlimited access to ALL courses (250-seed + 668-seed Premium)
- All community courses included
- Priority support
- Annual discount: Save 17%

**Launch Pricing (Q1 only):**
- 20% discount for first 1000 customers
- Lifetime grandfathered pricing (lock in Q1 rates forever)
- "Founding Member" badge in community

**Corporate/Institutional:**
- Custom pricing based on seat count
- White-label options
- Analytics dashboard
- Dedicated support

---

## Revenue Projections

### Conservative Scenario

**Assumptions:**
- 2% conversion from free Welsh users (60,000 users → 1,200 paid)
- 500 new paid users per month (Q1-Q2), 1,000/month (Q3-Q4)
- Average revenue per user (ARPU): £12/month
- 5% monthly churn

**Q1 2026:**
- Start: £60k/month
- New MRR: +£10k (1,200 users at £12 ARPU, offset by churn)
- End: £70k/month

**Q2 2026:**
- New MRR: +£15k (cumulative growth, lower churn as product matures)
- End: £85k/month

**Q3 2026:**
- New MRR: +£20k (Premium tier launches, higher ARPU)
- End: £105k/month

**Q4 2026:**
- New MRR: +£30k (holiday surge, annual subscriptions)
- End: £135k/month

**Annual Total (Conservative):** £1.2M (2x current baseline)

---

### Moderate Scenario

**Assumptions:**
- 5% conversion from Welsh users (60,000 → 3,000 paid)
- 1,000 new paid users per month (Q1-Q2), 2,000/month (Q3-Q4)
- ARPU: £15/month (more Premium tier adoption)
- 4% monthly churn (better onboarding)

**Q1 2026:**
- Start: £60k/month
- New MRR: +£20k
- End: £80k/month

**Q2 2026:**
- New MRR: +£20k
- End: £100k/month

**Q3 2026:**
- New MRR: +£30k (Premium + B2B)
- End: £130k/month

**Q4 2026:**
- New MRR: +£60k (year-end surge, corporate contracts)
- End: £190k/month

**Annual Total (Moderate):** £1.56M (2.6x current baseline)

---

### Aggressive Scenario

**Assumptions:**
- 10% conversion from Welsh users (60,000 → 6,000 paid)
- 2,000 new paid users per month (Q1-Q2), 4,000/month (Q3-Q4)
- ARPU: £18/month (strong Premium + Polyglot Pass uptake)
- 3% monthly churn (excellent product-market fit)

**Q1 2026:**
- Start: £60k/month
- New MRR: +£30k
- End: £90k/month

**Q2 2026:**
- New MRR: +£30k
- End: £120k/month

**Q3 2026:**
- New MRR: +£40k (viral growth, media coverage)
- End: £160k/month

**Q4 2026:**
- New MRR: +£70k (market leader positioning)
- End: £230k/month

**Annual Total (Aggressive):** £2.04M (3.8x current baseline)

---

### Revenue by Source (Moderate Scenario - Q4 2026)

| Source | Monthly Revenue | Percentage |
|--------|----------------|------------|
| Individual Subscriptions | £120k | 63% |
| Government Contracts (Welsh + new) | £40k | 21% |
| Corporate/Institutional | £20k | 11% |
| One-time payments / upsells | £10k | 5% |
| **Total** | **£190k** | **100%** |

---

## Milestones & KPIs

### Q1 2026 Milestones

**Product:**
- [ ] 30 courses live (250-seed)
- [ ] PWA app published (iOS + Android)
- [ ] Supabase MAR fully operational
- [ ] Course completion rate >40%

**Marketing:**
- [ ] 5 YouTuber partnerships secured
- [ ] 1,000 email subscribers
- [ ] PR in 3 major tech publications
- [ ] Early adopter program: 500 paid users

**Revenue:**
- [ ] £70k MRR (conservative)
- [ ] £80k MRR (moderate)
- [ ] £90k MRR (aggressive)

**Community:**
- [ ] Welsh user base: 65,000 (8% growth)
- [ ] New language forums active (Spanish, French, German)
- [ ] 5 language activists onboarded

---

### Q2 2026 Milestones

**Product:**
- [ ] 60 courses live (cumulative)
- [ ] Mobile app ratings: 4.5+ stars
- [ ] Cross-course audio reuse: 70% efficiency
- [ ] Course completion rate >50%

**Marketing:**
- [ ] 10 YouTuber partnerships total
- [ ] 5,000 email subscribers
- [ ] App Store featured app (1 region minimum)
- [ ] 2 corporate pilot programs launched

**Revenue:**
- [ ] £85k MRR (conservative)
- [ ] £100k MRR (moderate)
- [ ] £120k MRR (aggressive)

**Community:**
- [ ] Total active learners: 80,000
- [ ] Community courses: 3 live
- [ ] User-generated content: 100 testimonials

---

### Q3 2026 Milestones

**Product:**
- [ ] 100 courses live (Big 10 matrix complete)
- [ ] 15-20 Premium (668-seed) courses
- [ ] Community course platform beta
- [ ] Course completion rate >60%

**Marketing:**
- [ ] Major media coverage (NYT, WSJ, BBC, etc.)
- [ ] B2B sales pipeline: £50k potential ARR
- [ ] Polyglot conference keynote
- [ ] 10,000 email subscribers

**Revenue:**
- [ ] £105k MRR (conservative)
- [ ] £130k MRR (moderate)
- [ ] £160k MRR (aggressive)
- [ ] First £100k month achieved

**Community:**
- [ ] Total active learners: 100,000
- [ ] Community courses: 10 live
- [ ] Language activist grants: 5 awarded

---

### Q4 2026 Milestones

**Product:**
- [ ] 30-50 Premium (668-seed) courses
- [ ] Community platform full launch
- [ ] Regional variants (e.g., Spanish MX vs ES)
- [ ] Course completion rate >70%

**Marketing:**
- [ ] Product Hunt launch: Top 5 of the day
- [ ] B2B revenue: £20k MRR
- [ ] 20,000 email subscribers
- [ ] "Best Language App 2026" award nominations

**Revenue:**
- [ ] £135k MRR (conservative)
- [ ] £190k MRR (moderate)
- [ ] £230k MRR (aggressive)
- [ ] £1M ARR achieved (moderate+)

**Community:**
- [ ] Total active learners: 150,000
- [ ] Community courses: 20 live
- [ ] Endangered language partnerships: 10

---

## Risk Mitigation

### Technical Risks

**Risk:** Audio pipeline failure / TTS quality issues
**Mitigation:**
- Multi-provider strategy (Azure + ElevenLabs)
- Human voice fallback for edge cases
- QA workflow with sample flagging (already built)
- Budget buffer: £200/month for re-generation

**Risk:** Infrastructure scaling (S3, Supabase costs)
**Mitigation:**
- Monitor costs monthly
- Implement CDN caching for audio
- Audio deduplication via UUID system (already built)
- Negotiate volume pricing with providers at £100k MRR

**Risk:** Course quality / pedagogical issues
**Mitigation:**
- Beta testing with Welsh community
- Phased rollout (250-seed → 668-seed)
- User feedback loops
- Course refinement budget: 10% of production budget

---

### Market Risks

**Risk:** Low conversion from free to paid
**Mitigation:**
- Freemium model proven with Welsh
- Free trial period (7 days) for all paid tiers
- Money-back guarantee (30 days)
- In-app upgrade prompts at natural friction points

**Risk:** High churn rate
**Mitigation:**
- Onboarding optimization (first 7 days critical)
- Email re-engagement campaigns
- Progress tracking and gamification
- Community features (forums, leaderboards)
- Annual subscriptions (17% discount incentive)

**Risk:** Competitor response
**Mitigation:**
- Unique positioning: LEGO method, any-to-any languages
- Community courses = moat (free tier competitors can't match)
- Welsh success = proven methodology
- Speed to market: 100 courses by Q3 (hard to replicate)

---

### Financial Risks

**Risk:** Production costs exceed budget
**Mitigation:**
- Fixed monthly budget (£1000)
- Prioritize high-demand languages
- Audio reuse strategy (40% cost savings on variants)
- Defer low-demand courses to 2027

**Risk:** Slow revenue growth
**Mitigation:**
- Conservative scenario still 2x revenue (£1.2M ARR)
- Government contracts provide baseline (£30k/month)
- Multiple revenue streams (B2C, B2B, institutional)
- Flexible pricing: Can offer promotions if needed

**Risk:** Cash flow constraints
**Mitigation:**
- Annual subscriptions (upfront cash)
- Corporate contracts (quarterly/annual billing)
- Maintain 6-month runway minimum
- Line of credit if needed for scaling

---

## Community & Language Activist Strategy

### Vision

SSi becomes the platform of choice for language activists working to preserve and revitalize endangered languages.

### Free Tier Model

**Eligibility:**
- Minority languages (< 10M speakers)
- Endangered languages (UNESCO classification)
- Regional languages without commercial courses
- Community-driven (language activist partnership required)

**SSi Provides:**
- Free course production (up to 250 seeds)
- Hosting and infrastructure
- Technical support
- Marketing support (social media, email list)

**Language Activists Provide:**
- Content review (translations, cultural notes)
- Community moderation
- User support in native language
- Promotion within their community

### Partnership Process

1. **Application:** Language activist submits proposal
2. **Review:** SSi team evaluates (language viability, activist credibility)
3. **Agreement:** Partnership MOU (responsibilities, timeline)
4. **Production:** SSi generates course using automation pipeline
5. **Review:** Activist reviews and approves content
6. **Launch:** Joint marketing campaign
7. **Support:** Ongoing collaboration and user support

### Target Languages (2026)

**Q1-Q2:**
- Welsh (already live, expand variants)
- Irish (Gaelic) - `gle_for_eng`
- Scottish Gaelic - `gla_for_eng`
- Basque - `eus_for_spa`, `eus_for_fra`
- Catalan - `cat_for_spa`, `cat_for_fra`

**Q3-Q4:**
- Māori - `mri_for_eng`
- Hawaiian - `haw_for_eng`
- Navajo - `nav_for_eng`
- Cherokee - `chr_for_eng`
- Breton - `bre_for_fra`

**Benefits to SSi:**
- Brand positioning: "Language preservation leader"
- Marketing halo effect: Paid users support free tier
- Media coverage: "David vs Goliath" narrative
- User acquisition: Free users convert to paid for other languages
- Community goodwill: Aligns with mission-driven brand

---

## Key Marketing Messages

### Primary Message

"Learn any language like building with LEGOs - recombine what you know into infinite possibilities."

### Supporting Messages

**For Individual Learners:**
- "From zero to conversational in 90 days"
- "Science-backed spaced repetition + pedagogical expertise"
- "Learn from ANY language you already know, not just English"

**For Polyglots:**
- "Already bilingual? Learn faster using what you know"
- "Unlimited access to 100 language pairs"
- "The only app that teaches Spanish from German, French from Italian, etc."

**For Businesses:**
- "Global workforce, local languages"
- "Proven methodology: Largest online Welsh learning community"
- "Custom courses for your industry vocabulary"

**For Language Activists:**
- "Every language deserves to thrive"
- "Free course production for endangered languages"
- "Technology in service of cultural preservation"

**For Media:**
- "AI revolutionizes language learning with LEGO method"
- "From 0 to 100 language pairs in 12 months"
- "David beats Goliath: Small team outpaces Duolingo in course variety"

---

## Success Criteria

### 2026 Year-End Goals

**Revenue:**
- Minimum: £135k MRR (2.25x current) - £1.62M ARR
- Target: £190k MRR (3.17x current) - £2.28M ARR
- Stretch: £230k MRR (3.83x current) - £2.76M ARR

**Product:**
- 100+ courses live (Big 10 matrix complete)
- 30-50 Premium (668-seed) courses
- 20+ community courses
- PWA app with 4.5+ rating

**Users:**
- 150,000 total active learners
- 10,000+ paid subscribers
- 50% course completion rate (industry avg: 10-15%)

**Market Position:**
- Top 10 language learning apps (by variety)
- "Best for Polyglots" positioning
- 3+ major media features (NYT, WSJ, BBC, etc.)

**Community:**
- 10 language activist partnerships
- 5 endangered language courses live
- User-generated content: 1,000+ testimonials

---

## 2027 Preview

### Expansion Opportunities

**Product:**
- Voice recognition practice mode
- Live conversation practice (AI + human tutors)
- Regional variants (accents, dialects)
- Business/technical vocabulary modules
- Kids mode (gamified for ages 6-12)

**Languages:**
- Big 20 expansion (add Dutch, Swedish, Russian, Hindi, etc.)
- 100+ community courses (global coverage)
- Sign languages (ASL, BSL, etc.)

**Business:**
- Enterprise SaaS platform
- White-label courses for schools
- Government contracts (replicate Welsh success)
- International expansion (localized marketing)

**Technology:**
- Real-time speech synthesis improvements
- Adaptive learning paths (ML-powered)
- Social learning features (study groups, challenges)
- VR/AR integration (immersive practice)

---

## Conclusion

The SSi 2026 plan leverages our proven Welsh methodology, automated production pipeline, and unique any-to-any language positioning to achieve 2-4x revenue growth while maintaining our mission to support language preservation.

**Keys to Success:**
1. Fast execution: 100 courses by Q3 (speed = competitive moat)
2. Audio reuse economics: 40% cost savings on variants
3. Tiered pricing: Free community courses → paid premium
4. Multi-channel marketing: Content, partnerships, PR, paid
5. Mission-driven brand: Language preservation resonates

**Next Steps:**
1. Stakeholder review and approval
2. Finalize Q1 course production schedule
3. Hire marketing lead (if budget allows)
4. Secure initial YouTuber partnerships
5. Launch early adopter campaign (Dec 2025)

---

**Document Control:**
- **Version:** 1.0
- **Status:** DRAFT
- **Review Required:** Tom Cassidy, SSi Leadership
- **Next Update:** Post-review, targeting final version by 2025-12-31

---

## Appendix A: Production Calendar (Q1 2026 Detail)

### January 2026

**Week 1 (Jan 1-5):**
- Finalize `spa_for_eng` (anchor course)
- Begin audio generation for Spanish family
- Marketing: Early adopter email campaign

**Week 2 (Jan 6-12):**
- Complete Spanish family audio
- Generate manifests for `spa_for_fra`, `spa_for_deu`, `spa_for_ita`, `spa_for_por`
- Marketing: Launch blog series "Why the LEGO Method Works"

**Week 3 (Jan 13-19):**
- QA review: Spanish family
- Begin `eng_for_spa` (anchor course)
- Marketing: YouTuber outreach (first 5 partnerships)

**Week 4 (Jan 20-26):**
- Complete English family (`eng_for_spa`, `eng_for_fra`, `eng_for_deu`, `eng_for_ita`, `eng_for_por`)
- Marketing: Press release - "10 Courses Live"

**Week 5 (Jan 27-31):**
- Buffer week: Bug fixes, UX improvements
- Marketing: Social media campaign kickoff

### February 2026

**Week 1 (Feb 1-9):**
- French family production (`fra_for_eng` anchor + 4 variants)
- Marketing: First YouTuber reviews go live

**Week 2 (Feb 10-16):**
- Mandarin Chinese family production (`cmn_for_eng` anchor + 4 variants)
- Marketing: Polyglot podcast appearances

**Week 3 (Feb 17-23):**
- QA review: French + Chinese families
- Marketing: Product Hunt launch (soft launch, gather feedback)

**Week 4 (Feb 24-28):**
- Buffer week: Fix issues, prep for Q2
- Marketing: Press release - "30 Courses Live"

### March 2026

**Week 1 (Mar 1-9):**
- German family production (`deu_for_eng` anchor + 4 variants)
- Marketing: Corporate outreach begins

**Week 2 (Mar 10-16):**
- Italian family production (`ita_for_eng` anchor + 4 variants)
- Marketing: University partnership outreach

**Week 3 (Mar 17-23):**
- QA review: German + Italian families
- Marketing: Case study campaign - "90 Days to Conversational"

**Week 4 (Mar 24-31):**
- Buffer week: Q1 review, Q2 planning
- Marketing: Q1 results blog post, user testimonials

---

## Appendix B: Competitive Positioning

### SSi vs. Competitors

| Feature | SSi | Duolingo | Babbel | Rosetta Stone | Pimsleur |
|---------|-----|----------|--------|---------------|----------|
| **Languages** | 100+ pairs | ~40 | ~14 | ~25 | ~50 |
| **Any-to-any** | ✅ Yes | ❌ English-centric | ❌ English-centric | ❌ Limited | ❌ English-centric |
| **LEGO Method** | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |
| **Free Tier** | ✅ Community courses | ✅ Ad-supported | ❌ Trial only | ❌ Trial only | ❌ Trial only |
| **Premium Price** | £9.99-49.99/mo | £6.99/mo | £12.99/mo | £11.99/mo | £20.95/mo |
| **Completion Rate** | 50-70% (target) | ~10% | ~15% | ~20% | ~25% |
| **Unique Selling Point** | LEGO recombination | Gamification | Conversational focus | Immersion | Audio-only |

**SSi Differentiators:**
1. Any-to-any languages (learn Spanish from French, not just English)
2. LEGO method (proven with Welsh success)
3. Mission-driven (language preservation)
4. Higher completion rates (better pedagogy)
5. Community courses (unique free tier)

---

## Appendix C: Language Activist Partnership Template

### Partnership Proposal Template

**Course:** [Language] for [Known Language] speakers
**Language Activist:** [Name, Organization]
**Community Size:** [Estimated speaker count]
**Timeline:** [Proposed launch date]

**Responsibilities:**

**SSi will:**
- Generate 250-seed course using automation pipeline
- Provide hosting and infrastructure (S3, CDN, Supabase)
- Create PWA app integration
- Provide technical support
- Include in marketing campaigns (email, social media, PR)
- Offer free access to SSi community platform

**Language Activist will:**
- Review translations for accuracy and cultural appropriateness
- Provide 3-5 native speaker testers for beta
- Moderate language-specific forum/community
- Provide user support in native language (email, forum)
- Promote course within existing community
- Collaborate on marketing materials (testimonials, social proof)

**Timeline:**
- Week 1-2: Course generation (SSi automation)
- Week 3-4: Review and feedback (Activist)
- Week 5: Revisions and QA (SSi)
- Week 6: Beta testing (Activist community)
- Week 7: Launch preparation (joint marketing)
- Week 8: Public launch

**Success Metrics:**
- 500 active learners in first 6 months
- 4.0+ rating from beta testers
- 30%+ course completion rate
- Positive community feedback

**Agreement:**
This partnership is non-exclusive and may be terminated by either party with 30 days notice. Course content remains property of SSi but will be made freely available in perpetuity for the benefit of the language community.

---

**END OF DOCUMENT**
