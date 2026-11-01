from pathlib import Path
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

out = Path('output/pdf'); out.mkdir(parents=True, exist_ok=True)
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='Body', fontName='Helvetica', fontSize=9.5, leading=13.5, spaceAfter=8, textColor=colors.HexColor('#243d50')))
styles.add(ParagraphStyle(name='Question', fontName='Helvetica-Bold', fontSize=11, leading=14, spaceBefore=5, spaceAfter=4, textColor=colors.HexColor('#164c70')))
styles.add(ParagraphStyle(name='Cover', fontName='Helvetica-Bold', fontSize=30, leading=36, spaceAfter=18, textColor=colors.HexColor('#164c70')))
story=[]
def p(text): story.append(Paragraph(text, styles['Body']))
def q(n, question, answer):
    story.append(Paragraph(f'{n}. {question}', styles['Question']))
    p(f'<b>Draft answer:</b> {answer}')
def page(title):
    if story: story.append(PageBreak())
    story.append(Paragraph(title, styles['Heading1']))

story += [Spacer(1,55), Paragraph('COPEIT AI<br/>YC answer workbook', styles['Cover'])]
p('A truthful rehearsal companion to the YC interview brief. Prepared 30 October 2026.')
p('Use these as answer structures, not scripts. Replace every bracketed field with a fact you can prove. Do not say you have users, revenue, accuracy, partnerships, legal clearance, or an enterprise security certification unless you can show evidence.')
p('The proposed answer language uses the project’s current truth: Copeit is a prototype for exporters preparing product evidence for new markets, starting with India and the EU. The product can organize records, evidence, reviews and tasks. Its AI/retrieval release is still controlled and must not be represented as fully live for general customers.')
p('A useful answer has three parts: direct answer, one proof point, and the next learning. Keep it under 30 seconds unless the interviewer asks for depth.')

groups = [
('Product and clarity', [
('What is Copeit in one sentence?', 'Copeit is a workspace that helps exporters organize product evidence, expert review and the next actions needed to prepare for a new market, starting with India and the EU.'),
('What does a user do in the first five minutes?', 'They create a private workspace, add a product and its intended market, then see the evidence and actions that need review. The exact first live workflow should be demonstrated from the current build.'),
('Which exact task do you replace?', 'We reduce the manual work of chasing documents, tracking what has been reviewed and turning evidence gaps into assigned actions. We are not replacing accredited testing or legal judgment.'),
('What is the output a customer takes away?', 'A traceable workspace: product context, source versions, review decisions, evidence citations and a list of owners for unresolved actions.'),
('Who is the daily user?', 'Our initial hypothesis is the export, product or compliance manager at a small or midsize electronics exporter. We are validating which role logs in most often.'),
('Who pays and who approves spending?', 'Our hypothesis is the founder, operations lead or compliance lead. We will only claim a buyer after a real budget conversation or payment.'),
('Which electronics category comes first?', 'We will choose one narrow category after interviews identify a recurring evidence workflow. Today, the prototype is intentionally generic electronics rather than claiming a universal checklist.'),
('Why start India-to-EU?', 'It is a focused corridor with significant trade activity and a concrete exporter workflow. We will earn the right to expand by proving repeat use there first.'),
('How does EU-to-India differ?', 'It must be treated as a separate route with different authorities, importer obligations and source sets. We will not reuse an India-to-EU answer as if it applies in reverse.'),
('What will you deliberately not build?', 'We will not issue regulatory certifications, replace qualified reviewers, accept unreviewed sources into AI answers, or claim global coverage before we have each route’s evidence and experts.')]),
('Customer pain and discovery', [
('Who experienced this problem last week?', 'Use one real person: “[Name/role] at [company], with permission, was preparing [product] for [market] and had to coordinate [documents/reviewers].” If you do not have this yet, say it is the first interview target.'),
('How many buyer interviews have you completed?', 'Give the exact count, dates and roles. If the count is zero, say zero and explain that the immediate next task is ten targeted interviews, not pretending the idea is validated.'),
('What did your last five interviews change?', 'Name one product decision, one rejected assumption and one wording change. If no interviews have happened, do not fabricate this; say what you expect the first five to test.'),
('How do buyers solve this today?', 'Our hypothesis is a mix of spreadsheets, email, folders, consultants and labs. We need direct interviews to quantify the workflow and cost for this customer segment.'),
('How much time does that take?', 'Say the measured number from a customer’s last workflow. Until then: “We have not measured this well enough yet.”'),
('What does the delay cost them?', 'Ask customers about a specific delayed launch, retest, missed buyer request or consultant cost. Do not convert trade volume into customer loss without evidence.'),
('How often does the problem recur?', 'Find out whether it happens per SKU, per market entry, per evidence refresh or per regulatory change. Recurrence is central to whether this is software rather than a one-off service.'),
('Which customer refused your solution and why?', 'Name the actual objection: no urgency, consultant already handles it, price, trust, missing integration or narrow product fit. A rejection is useful data.'),
('Who is your strongest design partner?', 'Name only an organization that has agreed to test specific workflows. A friendly conversation, trial login or verbal encouragement is not a design partnership.'),
('What would make a buyer switch this month?', 'A faster evidence pack for a current launch, a buyer-request deadline, or a clear gap the current spreadsheet cannot show. Validate the trigger with an active opportunity.')]),
('Traction and engagement', [
('How many customers pay today?', 'State the exact number of paying organizations and collected revenue. If it is zero, say zero; the prototype and pipeline are different from paying customers.'),
('What is MRR today?', 'State actual recurring monthly revenue, excluding future commitments, nonrecurring services and test payments. If zero, say zero.'),
('How much revenue is services versus software?', 'Break invoices into recurring software, onboarding, expert review pass-through and bespoke consulting. Do not combine them into SaaS revenue.'),
('How many teams used it last week?', 'Use a defined metric: distinct organizations with a meaningful action such as creating a product, uploading approved evidence or completing a task. Exclude test accounts.'),
('How do you define active?', 'A team is active when it completes a meaningful workflow event for a live product in the measured period. Make the event and period explicit.'),
('What is activation rate?', 'Activated users divided by invited or signed-up users, with a clear activation event. Report the cohort date and sample size.'),
('How many users returned after a month?', 'Give cohort retention, not a lifetime total. If the cohort is too small, say the number is not meaningful yet.'),
('What is your strongest customer result?', 'Use one measured before/after outcome, such as evidence review time or number of unresolved gaps. Do not use a synthetic test as a customer result.'),
('How many pilots converted to paid?', 'Give pilots started, completed and paid conversions by cohort. A pilot still running is not a conversion.'),
('What is growth excluding test accounts?', 'Report only customer or approved pilot organizations. Show the source of the data and date range.')]),
('Competition and differentiation', [
('Who competes most directly?', 'Adherent/C2P, Enhesa, Assent, RegASK and relevant route-specific consultants are meaningful alternatives. The real choice may be spreadsheets plus a consultant.'),
('Why not use C2P?', 'C2P is a serious global product-compliance platform. Our claim is not that it lacks features; our hypothesis is that a narrower exporter workflow can reach usefulness faster. We must prove it.'),
('Why not use RegASK?', 'RegASK already combines intelligence, AI, expert validation and workflows. Our wedge needs to be a focused segment, distribution and clear customer outcome, not generic AI claims.'),
('Why not use a consultant?', 'Consultants provide trusted judgment and may remain essential. Copeit can help customers and consultants organize recurring evidence and follow-up work; we must test whether that improves the consultant workflow.'),
('Why not use a spreadsheet?', 'Spreadsheets are cheap and flexible. We only win if traceability, source versions, roles and recurring work materially reduce coordination pain.'),
('Why not use a general AI assistant?', 'General AI can research and draft, but Copeit is intended to connect approved evidence, review status, citations and assigned actions in a private workspace. We must demonstrate better outcomes.'),
('Which competitor capability is better than yours?', 'Large platforms have deeper established content, teams and enterprise integrations. We should acknowledge this and avoid competing on all features at once.'),
('Why would an incumbent fail to copy you?', 'They may not fail. A defensible position would come from better segment distribution, workflow data and customer trust built over time.'),
('What unique asset compounds with usage?', 'With permission, structured mappings between product characteristics, source versions, reviewer decisions and outcomes can compound. Public regulations and embeddings alone are not a moat.'),
('What is the switching cost without locking up customer data?', 'A customer stays because Copeit becomes the useful history of current evidence, decisions and recurring work. Data export must remain possible; lock-in is not the goal.')]),
('Market and expansion', [
('How did you calculate TAM?', 'Organizations that can buy this software multiplied by plausible annual spend. Trade volume is supporting context, not TAM.'),
('What is the exact account-count source?', 'Today our 100,000 global and 5,000 corridor figures are planning assumptions. We need a deduplicated, sourced account list before presenting them as research.'),
('Who is excluded from SAM?', 'Non-exporters, companies outside our product focus, one-time low-complexity sellers, companies without a recurring workflow, and organizations we cannot reach or sell to.'),
('Why is trade volume not TAM?', 'Goods flow measures products, not software-buying organizations or willingness to pay. A large trade corridor makes the problem plausible; it does not create SaaS revenue by itself.'),
('How many accounts can you realistically reach?', 'Give a named-channel model: association members, partner referrals, outbound accounts and conversion. Replace this with measured pipeline after the first campaigns.'),
('What makes the SOM attainable?', 'A sales-capacity model: targeted conversations, qualification, pilot conversion, paid conversion and retention. Our current SOM is a target, not evidence.'),
('What is the next segment and why?', 'Expand only after the first workflow shows repeat use and acceptable economics. The next segment should share buyer, source type or product data with the first.'),
('What prevents expansion to another country?', 'Each route requires verified source rights, local applicability, expert review, evaluation coverage and a buyer channel. Adding flags on a map is not coverage.'),
('Can this reach $100m ARR?', 'At a modeled $7,700 annual value per customer, it would need about 13,000 retained customers. That requires a much broader market or larger accounts, neither proven today.'),
('What market evidence would make you stop?', 'If tightly matched buyers do not experience recurring pain, will not run a pilot, or will not pay enough to cover trusted review and acquisition cost, we should narrow or stop.')]),
('Pricing and economics', [
('Why $299 rather than $29?', 'It is a proposed entry price based on intended value, not yet validated willingness to pay. We will test paid pilots and learn the support burden before treating it as final.'),
('What has a buyer agreed to pay?', 'Give only signed or paid commitments. If none, say none and share the date and plan for price testing.'),
('What changes between packages?', 'Make packages differ by products, markets, team controls, approved-source workflow, support and enterprise requirements. Do not sell features the product has not shipped.'),
('Why discount annual plans by 20%?', 'It is a proposed tradeoff for earlier commitment and cash. Validate whether buyers prefer annual payment and whether the discount preserves margin.'),
('How expensive is a reviewed answer?', 'Measure model cost, storage, support minutes and reviewer minutes per accepted answer. Today any figure is a model, not observed unit economics.'),
('How much human work is required per customer?', 'Track actual onboarding, review and support hours by customer. The business changes materially if a small plan needs many expert hours.'),
('What is fully loaded CAC?', 'Sales and marketing spend plus founder selling time allocated to acquired customers. Do not use an industry benchmark as your CAC.'),
('What is contribution margin?', 'Revenue less variable infrastructure, AI, payment, support and review costs. State which costs are included and the cohort date.'),
('What happens if AI cost doubles?', 'Set per-customer or per-workflow limits, use smaller models where quality permits, cache safe repeated work and preserve a positive margin before scaling usage.'),
('What is monthly burn and remaining runway?', 'Give your actual monthly cash outflow and cash balance. If you do not know it precisely, calculate it before the interview.')]),
('RAG and technical execution', [
('Walk us through upload to cited answer.', 'A source enters private quarantine, gets a version and checksum, stays pending until another authorized reviewer approves it, then a private worker extracts, chunks and embeds it. Ask Cope returns only approved eligible chunks and cites them, otherwise it abstains.'),
('How do you prevent self-approval?', 'The review RPC checks that the reviewer is not the uploader and requires an authorized role. We test this rule in staging.'),
('How do you determine source applicability?', 'Source approval only establishes that a source may be used. Product/market applicability needs structured rules and qualified review; citations are not a substitute.'),
('How do you handle conflicting rules?', 'Show both sources, their dates and scope, flag the conflict, and require human resolution. Never silently choose the answer that sounds most convenient.'),
('What happens after source revocation?', 'Revocation makes the source ineligible for retrieval, preserves the audit trail and should trigger a review of dependent answers and work items.'),
('How do you test tenant isolation?', 'Use two tenants, roles and direct API/storage/function attempts. Assert that source files, chunks, citations and audit records never cross the tenant boundary.'),
('Can a malicious document override instructions?', 'We treat source content as untrusted, constrain retrieved context and test prompt-injection cases. That reduces risk; it does not remove the need for monitoring and human review.'),
('How are embeddings and versions updated?', 'Each source version is immutable, has a checksum and its own chunks. Superseded or revoked versions are excluded from retrieval; reprocessing should be idempotent.'),
('What happens when Gemini is unavailable?', 'Queue work with bounded retries, show processing state, and return a clear unavailable or insufficient-evidence result rather than inventing an answer.'),
('Which measured evaluation failure worries you most?', 'An answer can cite a real source but apply it to the wrong product or market. We need evaluation of applicability and harmful omissions, not citation matching alone.')]),
('Trust, operations and legal boundaries', [
('Who reviews regulatory material?', 'Name the qualified reviewer and scope once contracted. Until then, Copeit should say that qualified review is required rather than imply we have it.'),
('What rights permit you to index each source?', 'We need source ownership, licensing and retention recorded before ingestion. Public availability does not automatically grant reuse rights.'),
('Where are source documents stored?', 'The design uses tenant-scoped private Supabase storage and private vector storage. Confirm the deployed environment and retention settings before making contractual claims.'),
('What data goes to the model provider?', 'Only the approved retrieval context and user question necessary for the answer should go to the server-side model call. Never put API keys or confidential source text in browser configuration.'),
('How can a customer delete or export data?', 'A verified request should drive an export/deletion workflow with an honest backup-retention explanation. The 90-day target is provisional until legal and provider settings are confirmed.'),
('What do you promise in your contract?', 'Workflow assistance and evidence organization, with clear AI limitations and no certification or legal-advice promise. Counsel must approve final terms.'),
('Who is responsible when guidance is wrong?', 'Customers remain responsible for decisions; Copeit must provide accurate product representations, clear limitations, auditability and a process to correct issues. Get legal advice for contractual allocation.'),
('How do you handle a security incident?', 'Contain access, rotate affected credentials, assess logs and data impact, restore safely, document the incident and notify as required. A real incident plan needs named owners and tested steps.'),
('How do you demonstrate backups restore?', 'Run and document a restore drill with the production provider, set RPO/RTO targets, and retain evidence. We cannot claim this before testing it.'),
('What prevents unsupported certification claims?', 'Product copy and AI outputs state that Copeit is workflow assistance, require approved evidence for answers and route decisions to qualified human review.')]),
('Founders and company', [
('Why are you building this?', 'Replace with your real story: the direct observation, customer access or workflow experience that made this problem unavoidable. Do not invent a personal origin story.'),
('What unusual customer insight do you have?', 'State one observed workflow detail and who showed it to you. If it is a hypothesis, say so and make the next validation step concrete.'),
('Who wrote the code and owns the IP?', 'State the actual contributors, repositories and agreements. Confirm the company owns the code before making an investor representation.'),
('How do founders divide responsibilities?', 'List the real split across customer discovery, product, engineering, sales and domain review. YC will spot generic titles without clear ownership.'),
('Are you working full time?', 'Answer directly with each founder’s actual commitment and any transition date. Do not overstate availability.'),
('What is the equity split?', 'Give exact legal ownership, vested/unvested shares and rationale. Bring the cap table.'),
('How do you resolve disagreement?', 'Use a real example: who decides which category or experiment runs next, and how you revisit a decision with evidence.'),
('What have you learned fastest?', 'Name a build or customer-learning cycle with a date, original belief, new evidence and changed action.'),
('What is your strongest evidence of persistence?', 'Use a specific thing you continued through: shipping the prototype, repeated customer outreach or solving a difficult technical issue. Keep it factual.'),
('Why is this team suited to the problem?', 'Connect each founder’s real skills or access to the next hard milestone. If expertise is missing, explain the concrete advisor or hire plan.')]),
('Growth, funding and hard follow-ups', [
('How will you find the next ten customers?', 'Build a named list through electronics exporter associations, labs, consultants, trade events, buyer referrals and direct outbound. Track every conversation and response.'),
('What is the sales cycle?', 'Measure first contact to paid pilot by segment. Until then, say it is unknown and avoid a fictional 30-day answer.'),
('Which channel have you tested?', 'Give actual sends, calls, meetings and conversions. If no channel has been tested, choose one this week and report the result.'),
('Why apply to YC now?', 'We have enough product foundation to learn faster, but need focused customer discovery and a repeatable path to paid adoption before expanding the scope.'),
('What would you do with funding?', 'Fund the next proof: customer acquisition experiments, reliable evidence workflow, qualified review capacity and narrow product-market fit. Tie spend to measurable milestones.'),
('What milestone will you reach in three months?', 'Choose a defensible goal such as [X] matched interviews, [Y] active design partners, [Z] paid pilots and a measured workflow outcome. Put dates and owners beside it.'),
('Why might this fail?', 'Customers may prefer consultants, the problem may not recur enough for software, trusted review may be too costly, or incumbents may be sufficient. We test these early.'),
('What if customers only want consulting?', 'Use consulting as discovery only if it produces a repeatable workflow. Productize repeated artifacts; if every engagement is bespoke, change the model or narrow the problem.'),
('What if an incumbent offers this free?', 'We need a reason customers choose us beyond a feature: trusted distribution, faster focused workflow or proprietary operational data. If we cannot prove one, we should not assume survival.'),
('What is the most important question we did not ask?', 'Ask: “What evidence would make you believe exporters will pay and stay?” Then answer with the next experiment and the exact metric that would change your mind.')])]

n=0
for title, items in groups:
    page(title)
    p('Rehearse in your own words. Replace placeholders with dated evidence. A short honest answer is stronger than a polished unsupported claim.')
    for question, answer in items:
        n += 1; q(n, question, answer)

page('How to get your first real customer conversations')
p('<b>Today:</b> make a list of 30 people in the narrow segment: electronics exporters, export managers, compliance leads, testing labs, consultants and trade-association contacts. Your goal is a 15-minute learning call, not a sale.')
p('<b>Message:</b> “Hi [Name], I am researching how electronics exporters prepare product evidence for [India/EU] market entry. I am not selling anything on this call. Could I ask 8 questions about the last product or market launch you handled? I will share a summary of what I learn.”')
p('<b>Ask:</b> “Tell me about the last launch.” “What documents did you need?” “Who owned each step?” “Where did work stall?” “What did it cost?” “How often does this happen?” “What have you tried?” “Would you test a workspace that organizes this?”')
p('<b>After every call:</b> write the exact wording, workflow, stakes, tools, budget owner, urgency and next step. Send a two-sentence recap. Do not pitch product features before you understand the actual workflow.')
p('<b>After ten calls:</b> choose one repeated high-cost workflow, create a narrow demo using the caller’s language, and ask for a paid or unpaid design-pilot commitment with a concrete start date.')

def foot(c,d):
    c.setStrokeColor(colors.HexColor('#d8e1e7')); c.line(45,43,550,43)
    c.setFont('Helvetica',8); c.setFillColor(colors.HexColor('#587082'))
    c.drawString(45,30,'COPEIT AI | YC rehearsal workbook | 30 October 2026')
    c.drawRightString(550,30,str(d.page))
path=out/'Copeit_AI_YC_Answer_Workbook.pdf'
SimpleDocTemplate(str(path), pagesize=(595,842), rightMargin=45, leftMargin=45, topMargin=44, bottomMargin=60, title='Copeit AI YC Answer Workbook', author='Copeit AI').build(story, onFirstPage=foot, onLaterPages=foot)
print(path.resolve())
