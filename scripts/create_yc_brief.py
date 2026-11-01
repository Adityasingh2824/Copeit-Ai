from pathlib import Path
from html import escape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT

OUT=Path('output/pdf'); OUT.mkdir(parents=True, exist_ok=True)
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='BodyCope',fontName='Helvetica',fontSize=10,leading=15,spaceAfter=9,textColor=colors.HexColor('#243d50')))
styles.add(ParagraphStyle(name='CoverCope',fontName='Helvetica-Bold',fontSize=32,leading=38,spaceAfter=22,textColor=colors.HexColor('#164c70')))
styles['Heading1'].textColor=colors.HexColor('#164c70')
styles['Heading2'].textColor=colors.HexColor('#164c70')
story=[]
def p(s): story.append(Paragraph(s, styles['BodyCope']))
def h(s): story.append(Paragraph(s,styles['Heading2']))
def page(title):
    if story: story.append(PageBreak())
    story.append(Paragraph(title,styles['Heading1']))
def table(rows,widths=None):
    data=[[Paragraph(escape(str(c)),styles['BodyCope']) for c in r] for r in rows]
    t=Table(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e5eff5')),('VALIGN',(0,0),(-1,-1),'TOP'),('LINEBELOW',(0,0),(-1,-1),.4,colors.HexColor('#d8e1e7')),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),7)]))
    story.append(t);story.append(Spacer(1,12))

story.append(Spacer(1,55))
story.append(Paragraph('COPEIT AI<br/>YC interview &amp;<br/>business research brief',styles['CoverCope']))
p('Prepared for Aditya Singh | 30 October 2026')
p('<b>India to EU. EU to India. A focused starting point for a global product-readiness workspace.</b>')
p('Includes 100 practice questions, answer guidance, competitor research, market-sizing models, revenue scenarios, and a practical validation roadmap.')
p('<b>How to read this report:</b> [F] = externally sourced fact; [P] = project evidence from the repository and prior verified session; [H] = hypothesis, proposed target, or illustrative model. Models are not traction or forecasts. No source proves a measured Copeit TAM today.')
p('Research covers selected official YC, government, and vendor sources. It cannot cover every website or predict every interview question. Competitor information is vendor-reported, not an independent product trial. Links are provided in the source register.')
p('Founder inputs still needed: actual customer count, revenue, retention, interviews, background, cofounder arrangements, cap table, runway, and signed pilot commitments. None are invented here.')

page('1. The pitch you can defend')
h('One sentence')
p('[H: positioning] Copeit helps electronics exporters organize the evidence and expert review needed to prepare products for a new market, starting with India and the EU.')
h('A short opening answer')
p('We are building a workspace for exporters to connect product details, source documents, review decisions, and next actions. We are starting with electronics moving between India and the EU. Ask Cope is designed to answer from approved evidence with citations, and to abstain when evidence is missing. We have a prototype and are validating the workflow; customer traction and revenue must be stated from our actual records.')
h('The precise customer hypothesis')
p('[H] Start with a small or midsize electronics manufacturer/exporter planning its next India-to-EU product launch. The user is the export or compliance manager; the buyer may be the founder or operations lead. Separate EU-to-India applicability and importer responsibilities must be researched independently. Do not claim one checklist works in both directions.')
h('The job, trigger, and alternative')
p('[H] Trigger: a buyer requests a new product evidence pack or the company enters a new market. Job: identify which evidence exists, which questions require expert review, and who must resolve each gap. Existing substitute: email, spreadsheets, shared folders, consultants, and laboratory correspondence. Validate this in interviews rather than claiming every exporter works this way.')
h('What to say when asked about traction')
p('We are at prototype stage. We have built and tested parts of the workflow, and are working through live acceptance and onboarding. Then give only verified customer, usage, and revenue figures. A test account is not a customer; a demo is not recurring usage; a letter of intent is not revenue.')

page('2. Product truth: built, demonstrated, pending')
table([['Area','Defensible status [P]'],['Frontend and workspace','React/Vite interface, product/task views, profile and team flows exist. A Vercel deployment exists; latest local changes are not proven deployed.'],['Authentication','Sign-in, signup, recovery and Turnstile integration code exist. Staging workspace RPC checks email confirmation. Turnstile configuration and public email delivery remain launch dependencies.'],['RAG','Source review, versioning, private vector design, Gemini functions and tests exist. Earlier synthetic cited answers were reported; the current queued-worker release still needs live acceptance.'],['Billing','Indicative USD prices only. Dodo checkout, verified webhooks and entitlements are unfinished.'],['Enterprise readiness','No verified SOC 2, ISO certification, production penetration test, recovery drill or comprehensive live isolation sign-off in the reviewed evidence.'],['Traction','Paying customers, MRR, retention and customer ROI are not verified.']], [130,370])
p('Reviewed project evidence: README.md, PROJECT_LOG.md and the implementation/verification record in this conversation. Repository claims sometimes describe planned architecture; code presence does not prove runtime readiness.')
h('Before a public prototype')
p('Finish Turnstile configuration and actual email delivery to external users; test fresh signup, confirmation, recovery and logout; verify concurrent workspace requests cannot create duplicate owner workspaces; deploy and test the current functions; ensure public uploads obey server-side eligibility rules. The current workspace limit uses a check-before-insert pattern and needs transactional concurrency protection before claiming a hard limit.')
p('For the demo, show an approved synthetic source, a cited supported answer, an unsupported question that abstains, and a forbidden cross-tenant attempt. Label synthetic material visibly. Do not call the demo a regulatory certification.')

page('3. Competitors: the serious alternatives')
p('This is a prioritized landscape, not an exhaustive census. Product pricing and implementation time were not verified unless explicitly stated. Do not claim competitors lack AI, citations, or evidence management.')
table([['Alternative','Verified positioning','Copeit response to test [H]'],['Adherent / C2P [S4]','Formerly Compliance & Risks; product compliance, regulatory applicability, requirements and evidence workflows. AI is already part of its positioning.','Win a narrower exporter segment with faster useful onboarding and route-specific execution.'],['Enhesa [S5]','Product intelligence across chemicals and broader product compliance topics.','Organize the exporter work around reviewed intelligence; content partnerships may be preferable to recreating coverage.'],['Assent [S6]','Supply-chain product compliance data collection, including substance requirements.','Focus on readiness coordination where supplier-material data collection is not the primary job.'],['RegASK [S7]','AI regulatory intelligence, cited assistant answers, expert validation and workflow orchestration.','Prove segment focus and commercial fit; generic AI plus expert review is not unique.'],['RegDesk [S8]','Regulatory information management focused on medical-device manufacturers.','Keep electronics focus; do not expand into regulated medical devices casually.']], [112,198,190])

page('4. Competitors, substitutes & potential partners')
table([['Alternative','Overlap and implication'],['SAP Global Trade Services [S9]','Trade compliance and customs processes. Adjacent enterprise system, not identical to product evidence readiness. Integration could be more useful than replacement.'],['SGS [S10]','Product conformity and market-access services. Competes for parts of the budget; can also be a testing/review partner. Copeit cannot replace accredited testing.'],['EU Access2Markets [S11]','Official trade information, including duties and product requirements. A free information substitute and potential source, not a private team evidence workspace.'],['Consultants and labs','Existing trust, expertise and accepted outputs can outweigh software convenience. Local consultants were not individually benchmarked in this research.'],['Spreadsheets, email and folders','Low incremental cost, familiar, flexible. The real hurdle is proving enough recurring value to justify a subscription.'],['General AI assistants','Convenient research/drafting substitute. Compare traceability and workflow completion on a controlled task; do not assume Copeit is more accurate.']], [145,355])
h('Potential advantages versus proven advantages')
p('[H] Corridor-specific onboarding; readable evidence-to-task links; affordable entry packages; local exporter distribution; reusable product evidence history. Each is a hypothesis. Current implementation progress is real, but no measured competitive win rate, superior accuracy, or cost advantage is verified.')
h('How a moat could develop')
p('With permission, accumulate structured source-version-to-product mappings and correction histories; build trusted reviewer/lab partnerships; make recurring evidence refresh and buyer requests useful; integrate into customer operations. Public regulations and vector embeddings alone are easily reproducible. Never pool confidential tenant documents into a shared corpus without authorization.')

page('5. Market context and TAM / SAM / SOM')
p('[F, S3] The European Commission reports EU-India goods trade of EUR118 billion in 2025 and roughly 6,000 European companies present in India. It reports FTA negotiations concluded on 27 January 2026. Negotiation conclusion is not evidence that the agreement is in force. These facts support corridor relevance, not a software market-size calculation.')
p('<b>Unit of sale:</b> one paying organization/workspace, not shipment value, individual exporters on a directory, products, or users. Deduplicate organizations that trade in both directions. Do not count every Indian MSME as an export compliance software buyer.')
table([['Model','Illustrative account universe [H]','Annual spend [H]','Annual software opportunity'],['Global TAM','100,000 organizations','$6,000','$600 million'],['Initial corridor SAM','5,000 qualified organizations','$6,000','$30 million'],['Year-3 SOM target','150 retained customers','$6,000','$900,000 ARR']], [82,170,103,145])
p('<b>These are scenario inputs, not researched company counts.</b> No verified dataset of eligible India-EU electronics buyers was obtained. The SAM and SOM are therefore provisional and must not be presented as established market facts. The SOM equals 3% of this assumed SAM, but sales capacity must justify it independently.')
h('Sensitivity rather than false precision')
p('At $3k / $6k / $12k annual spend, a hypothetical global universe of 100,000 accounts gives $300m / $600m / $1.2bn TAM. A hypothetical 5,000-account corridor gives $15m / $30m / $60m SAM. These ranges vary price only; account-count uncertainty is additional.')
h('How to replace the assumptions')
p('Build an auditable account list from exporter associations, public company records, trade directories and opt-in partner referrals. Filter for electronics, active target-market sales, recurring launches, evidence ownership, budget and buyer access. Deduplicate legal entities and parent companies; manually verify a sample. Separate measured records from extrapolation and preserve the denominator, date and exclusion rules.')

page('6. Pricing and revenue potential')
p('[P] Proposed prices below come from your latest project pricing. Annual plans receive 20% off twelve monthly payments. Entitlements and willingness to pay remain unvalidated; Enterprise is a starting price.')
table([['Package','Monthly','Annual prepaid','Annual effective monthly'],['Pilot','$299','$2,870.40','$239.20'],['Starter','$499','$4,790.40','$399.20'],['Growth','$1,999','$19,190.40','$1,599.20'],['Enterprise from','$4,999','$47,990.40','$3,999.20']], [135,85,140,140])
p('[H] Illustrative mix: 50% Pilot, 35% Starter, 12% Growth, 3% Enterprise. Weighted list MRR/customer = $713. If 50% take annual pricing, blended recognized monthly subscription revenue/customer = $641.70; annualized value = $7,700.40. This mix is a sensitivity example, not a sales forecast; it differs from the simple $6k market-sizing input.')
table([['Paying customers','Monthly run rate','Annualized recurring revenue'],['25','$16,042.50','$192,510'],['100','$64,170','$770,040'],['500','$320,850','$3,850,200'],['1,000','$641,700','$7,700,400']], [140,170,190])
p('ARR is a run-rate metric, not booked annual revenue or cash in the bank. At the same mix, 100 customers acquired uniformly from zero over a year represent about 50 customer-years and roughly $385,020 first-year subscription revenue before churn; actual cohort timing changes this. Annual prepayments alter cash timing, not the monthly revenue earned.')
p('A $100m ARR ambition at $7,700.40 annual revenue/customer needs approximately 12,987 retained customers. This requires expansion beyond the initial assumed 5,000-account corridor or materially higher account value. There is no evidence today that Copeit will achieve it.')

page('7. Unit economics and sales capacity')
p('All figures on this page are planning assumptions. Taxes, FX, merchant terms, refunds and actual provider charges are not modeled as verified costs.')
table([['Per customer/month example','Amount'],['Blended subscription revenue','$641.70'],['AI + storage + infrastructure','$45.00'],['Human review/support (2 hours x $30)','$60.00'],['Payment/refund allowance (5% of revenue)','$32.09'],['Contribution after these costs','$504.61'],['Illustrative contribution margin','78.6%']], [350,150])
p('At 8 review/support hours per customer instead, contribution falls to $324.61, or 50.6%. At $2,000 fully loaded CAC, payback is about 4.0 months in the first case or 6.2 months in the second. These are modeled contribution margins; do not report them as measured gross margin. Founder labor, content licensing and reviewer capacity must be costed.')
p('At $20,000 monthly fixed operating expense, the first model needs approximately 40 active customers to cover fixed expense before taxes and financing. This excludes growth investment unless included in that expense input. A simplistic LTV = monthly contribution / monthly churn gives $25,231 at 2% churn, but no mature churn cohorts exist to support that valuation.')
h('A defensible 12-month target model')
p('[H] Work backward from 40 retained customers: 400 targeted conversations x 40% qualified x 50% pilot x 50% paid = 40 gross wins, before churn. This means roughly 34 conversations per month and eight reviewable pilot starts per month over the active selling period. Channel conversion and cycle length must be measured, not borrowed from SaaS benchmarks.')
h('What to instrument')
p('Qualified lead to pilot; pilot to paid; time to first independently reviewed evidence pack; weekly active teams; repeat product launches; customer-specific hours saved; grounded answer rate; incorrect-answer severity; review minutes; AI cost per accepted answer; gross and net revenue retention; refund rate and cash runway.')

page('8. Future potential and the execution sequence')
table([['Horizon [H]','Capability','Evidence required to advance'],['0-30 days','Narrow electronics workflow; reliable onboarding; verified synthetic RAG; 15-20 buyer interviews.','Fresh signup and end-to-end demo work; buyers confirm a recurring pain.'],['30-90 days','3-5 design partners; qualified reviewer; source rights; first paid pilots.','Baseline and post-use review effort; willingness to pay; observed repeat usage.'],['3-12 months','Repeatable India-to-EU flow; then independently validated EU-to-India coverage.','Retention, acceptable review burden, source-update ownership and contribution margin.'],['12-24 months','More product types, integrations and partner-led distribution.','Each expansion has buyer demand, licensed/usable sources, reviewers and evaluation coverage.'],['Longer term','Cross-market evidence reuse and change-impact workflows.','Demonstrated retention and trusted mappings; expansion economics beat narrow-segment economics.']], [85,205,210])
p('Possible additional revenue: higher product/market limits, enterprise controls, separately priced expert-review services, and APIs. Avoid double counting service pass-through as software ARR. Do not assume payments or a marketplace automatically create a network effect.')
h('The hardest risks')
p('Weak recurring demand; small buyers unwilling to pay; expensive expert review; stale or unlicensed content; errors with real business consequences; incumbent bundling; low trust in AI; insufficient founder distribution; too many routes too early. A citation can be accurate while the answer misapplies the source. Evaluate applicability and completeness, not just citation existence.')

page('9. Answers to the questions that matter most')
answers=[
('What do you do?','Use the one-sentence exporter/evidence description. Avoid starting with RAG, Gemini, TAM or enterprise-grade.'),
('Who wants this?','Name the buyer profile and a verified interview example. If you have not interviewed that buyer, say this is the current hypothesis.'),
('What have you built?','Describe the working prototype, then distinguish current release acceptance from earlier synthetic demonstrations. Do not claim public signup or full AI is live until tested.'),
('How much revenue?','Report actual collected revenue and recurring revenue separately. No payment or customer evidence was verified for this report; do not use forecast figures as traction.'),
('Why not ChatGPT?','We aim to connect evidence versions, independent review and next actions in a private team workflow. We still must prove customers value that over general AI plus folders.'),
('Why not C2P or RegASK?','They already provide sophisticated intelligence and workflows. Our bet is a tightly scoped exporter experience and distribution, validated through faster useful outcomes.'),
('How big can it get?','Explain organizations x annual software spend. Present the $600m TAM as a hypothesis needing account-list validation, then explain the corridor entry point.'),
('What is unique?','Today the proposed wedge is corridor and customer focus. Durable differentiation must come from trusted mappings, workflow adoption and distribution; AI alone is not a moat.'),
('Can users trust the AI?','We restrict answers to permitted evidence and test citations, abstention and isolation. This reduces some failure modes but does not establish regulatory correctness; expert review remains necessary.'),
('Why now?','Trade-route activity and better AI tools may improve timing. Use the Commission trade figures as context and a recent verified buyer workflow as the actual purchase trigger.'),
('Why you?','Supply your real exporter insight, technical work, access to customers and learning speed. Do not invent industry credentials or a cofounder story.'),
('What will YC change?','Propose focused support: buyer learning, product speed and repeatable sales. Tie funding to a measurable milestone rather than promising global compliance coverage.')]
for idx,(q,a) in enumerate(answers):
    if idx==6: page('Answer practice | Market, trust and founders')
    h(q);p(a)

groups=[
('Product and clarity',['What is Copeit in one sentence?','What does a user do in the first five minutes?','Which exact task do you replace?','What is the output a customer takes away?','Who is the daily user?','Who pays and who approves spending?','Which electronics category comes first?','Why start India-to-EU?','How does EU-to-India differ?','What will you deliberately not build?']),
('Customer pain and discovery',['Who experienced this problem last week?','How many buyer interviews have you completed?','What did your last five interviews change?','How do buyers solve this today?','How much time does that take?','What does the delay cost them?','How often does the problem recur?','Which customer refused your solution and why?','Who is your strongest design partner?','What would make a buyer switch this month?']),
('Traction and engagement',['How many customers pay today?','What is MRR today?','How much revenue is services versus software?','How many teams used it last week?','How do you define active?','What is activation rate?','How many users returned after a month?','What is your strongest customer result?','How many pilots converted to paid?','What is growth excluding test accounts?']),
('Competition and differentiation',['Who competes most directly?','Why not use C2P?','Why not use RegASK?','Why not use a consultant?','Why not use a spreadsheet?','Why not use a general AI assistant?','Which competitor capability is better than yours?','Why would an incumbent fail to copy you?','What unique asset compounds with usage?','What is the switching cost without locking up customer data?']),
('Market and expansion',['How did you calculate TAM?','What is the exact account-count source?','Who is excluded from SAM?','Why is trade volume not TAM?','How many accounts can you realistically reach?','What makes the SOM attainable?','What is the next segment and why?','What prevents expansion to another country?','Can this reach $100m ARR?','What market evidence would make you stop?']),
('Pricing and economics',['Why $299 rather than $29?','What has a buyer agreed to pay?','What changes between packages?','Why discount annual plans by 20%?','How expensive is a reviewed answer?','How much human work is required per customer?','What is fully loaded CAC?','What is contribution margin?','What happens if AI cost doubles?','What is monthly burn and remaining runway?']),
('RAG and technical execution',['Walk us through upload to cited answer.','How do you prevent self-approval?','How do you determine source applicability?','How do you handle conflicting rules?','What happens after source revocation?','How do you test tenant isolation?','Can a malicious document override instructions?','How are embeddings and versions updated?','What happens when Gemini is unavailable?','Which measured evaluation failure worries you most?']),
('Trust, operations and legal boundaries',['Who reviews regulatory material?','What rights permit you to index each source?','Where are source documents stored?','What data goes to the model provider?','How can a customer delete or export data?','What do you promise in your contract?','Who is responsible when guidance is wrong?','How do you handle a security incident?','How do you demonstrate backups restore?','What prevents unsupported certification claims?']),
('Founders and company',['Why are you building this?','What unusual customer insight do you have?','Who wrote the code and owns the IP?','How do founders divide responsibilities?','Are you working full time?','What is the equity split?','How do you resolve disagreement?','What have you learned fastest?','What is your strongest evidence of persistence?','Why is this team suited to the problem?']),
('Growth, funding and hard follow-ups',['How will you find the next ten customers?','What is the sales cycle?','Which channel have you tested?','Why apply to YC now?','What would you do with funding?','What milestone will you reach in three months?','Why might this fail?','What if customers only want consulting?','What if an incumbent offers this free?','What is the most important question we did not ask?'])]
number=0
for title,questions in groups:
    page('Practice bank | '+title)
    p('Original practice prompts tailored to Copeit. These are not an official YC question list or a prediction of your interview. Answer the question first, then add one concrete fact.')
    for q in questions:
        number+=1;p('<b>'+str(number)+'. '+escape(q)+'</b>')
    h('What to bring to this round')
    p({'Product and clarity':'A working screen and one customer journey; separate what exists from the roadmap.','Customer pain and discovery':'Dated interview notes, consented quotes, existing workflow examples and objections.','Traction and engagement':'Actual cohorts, invoices, usage definitions and test-account exclusions.','Competition and differentiation':'A fair task-by-task comparison; acknowledged incumbent strengths and measured switching reasons.','Market and expansion':'A deduplicated account list, inclusion criteria, pricing evidence and reachable pipeline.','Pricing and economics':'A cohort-level revenue/cost model, review-time records and paid demand evidence.','RAG and technical execution':'A live synthetic demonstration, evaluation failures, audit trail and negative-test results.','Trust, operations and legal boundaries':'Named owners, source permissions, actual policies and a tested incident procedure.','Founders and company':'Real founder biographies, ownership documents, commitments and relevant experience.','Growth, funding and hard follow-ups':'A focused experiment plan, measured channel economics and explicit stop/pivot criteria.'}[title])

page('10. Interview rehearsal and founder homework')
p('[F, S1] YC recommends plain language, conversation instead of a memorized pitch, and being able to explain the company without depending on a demo. There is no single prescribed question pattern.')
h('Run a ten-minute practice drill')
p('First minute: explain product and buyer. Next three: customer pain and actual traction. Next three: competition, market math and technical trust. Last three: team, growth and hard objections. This is a suggested rehearsal, not a claim about the current official interview format. Have a friend interrupt and ask for evidence.')
h('Facts to fill in before the interview')
p('Actual incorporation and ownership; founder commitment and skills; number of interviewed buyers; named design partners with permission; launch status; weekly active organizations; paid customers; collected revenue; recurring revenue; cash; burn; runway; strongest measured outcome; most serious unresolved risk. Where unknown, say unknown and give your next experiment.')
h('Funding context')
p('[F, S2] YC describes a $500,000 standard investment: $125,000 for 7% and $375,000 on an uncapped MFN SAFE. Do not describe the whole deal as $500,000 for exactly 7%; additional dilution depends on financing terms. Obtain professional advice before signing financing documents.')
h('Suggested next seven days [H]')
p('Days 1-2: repair and record a fresh-account demo and full synthetic evidence flow. Days 2-4: talk to ten narrowly matched buyers and two qualified reviewers. Days 4-5: run three hands-on workflow trials against existing spreadsheets/consultants. Day 6: ask for paid commitments with clear scope. Day 7: update the pitch and market model using actual objections, usage and willingness to pay.')
p('Do not memorize every answer. Know your actual numbers, admit uncertainty, and be ready to show what changed after talking to customers.')

page('11. Sources and evidence ledger')
p('Web sources accessed 30 October 2026. Figures retain their original reporting periods. Vendor claims describe public positioning and have not been independently audited. Copeit financial models are original arithmetic using explicitly assumed inputs, not facts from these websites.')
sources=[('S1','YC interview advice','https://www.ycombinator.com/blog/tips-for-yc-interviews/'),('S2','YC standard deal','https://www.ycombinator.com/deal'),('S3','European Commission: EU trade relations with India','https://policy.trade.ec.europa.eu/eu-trade-relationships-country-and-region/countries-and-regions/india_en'),('S4','Adherent (formerly Compliance & Risks), product platform','https://www.adherent.com/'),('S5','Enhesa Product Intelligence expertise','https://www.enhesa.com/product-intelligence-solution/our-expertise/'),('S6','Assent solutions','https://www.assent.com/solutions/'),('S7','RegASK platform','https://regask.com/'),('S8','RegDesk MedTech platform','https://www.regdesk.co/'),('S9','SAP Global Trade Services','https://www.sap.com/products/financial-management/global-trade-management.html'),('S10','SGS product conformity','https://tfs.sgs.com/solutions/product-conformity'),('S11','European Commission Access2Markets overview','https://www.eeas.europa.eu/sites/default/files/access2markets_digital_leaflet_en.pdf')]
for key,title,url in sources:
    p('<b>'+key+' | '+title+'</b><br/><link href="'+url+'" color="#166492">'+url+'</link>')
p('Internal basis [P]: Copeit README.md and PROJECT_LOG.md reviewed in this session, plus prior tool-confirmed staging results in the conversation. No secret credentials, private customer records, or full planning documents are included.')
p('Research gaps: verified target-account counts, competitor quotes, buyer interviews, actual Copeit revenue/retention, source licensing, and founder details. Before sending to investors, replace model assumptions with evidence and update any changed vendor or government facts.')

def footer(c,d):
    c.setStrokeColor(colors.HexColor('#d8e1e7')); c.line(45,43,550,43)
    c.setFont('Helvetica',8);c.setFillColor(colors.HexColor('#587082'))
    c.drawString(45,30,'COPEIT AI | Founder preparation | 30 October 2026')
    c.drawRightString(550,30,str(d.page))
path=OUT/'Copeit_AI_YC_Interview_and_Market_Brief.pdf'
SimpleDocTemplate(str(path),pagesize=(595,842),rightMargin=45,leftMargin=45,topMargin=44,bottomMargin=60,title='Copeit AI - YC Interview and Market Brief',author='Copeit AI').build(story,onFirstPage=footer,onLaterPages=footer)
print(path.resolve())
