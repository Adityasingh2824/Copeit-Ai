import React from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

const policyNotice = 'This is a provisional v1 policy page. It is not legal advice and must be replaced or approved by qualified counsel before customer onboarding or paid access.';
const supportEmail = 'adityasingh852005@gmail.com';

const pages = {
  privacy: { title: 'Privacy notice', intro: 'How Copeit AI intends to handle personal and workspace data during the pilot.', sections: [
    ['What we collect', 'Account details, workspace records, support correspondence, security logs, and only the files a permitted user uploads. Copeit does not accept customer files until the private evidence controls are enabled and reviewed.'],
    ['AI and web research', 'Questions are processed by Google Gemini. When reviewed evidence is insufficient, Cope extracts a generic public topic for Google Search. Workspace identifiers, product names, model numbers and uploaded document contents are excluded from search context. Avoid entering private information in questions. Web research is labeled separately and requires review before admission to approved evidence.'],
    ['Why we use it', 'To provide the workspace, protect accounts, investigate incidents, support users, and meet legal obligations. Copeit does not sell personal data.'],
    ['Hosting location', 'The current production Supabase project is hosted in Singapore. The frontend is hosted by Vercel. AI requests use Google Gemini. Do not assume EU-only processing; data-transfer terms and subprocessor details remain under review.'],
    ['Retention and deletion', 'Verified deletion requests target removal of live customer data within 90 days. Backup copies may persist until their provider-managed retention cycle ends; Copeit will not promise a shorter backup deletion period than it can verify.'],
  ]},
  terms: { title: 'Terms of service', intro: 'The provisional rules for using the Copeit AI pilot.', sections: [
    ['Web research', 'Cope can answer general questions through public web research. Web answers display publisher links and Google Search attribution. Regulatory claims prioritize official sources. Web results require qualified review before product-specific decisions or admission to approved evidence.'],
    ['Service scope', 'Copeit organizes product context, evidence workflows, and source-grounded assistance. It does not certify products, determine market access, provide legal advice, or replace qualified regulatory review.'],
    ['Your responsibilities', 'You must have rights to upload material, protect account access, verify decisions with qualified professionals, and not use the service for unlawful or harmful activity.'],
    ['Free early access', 'This release is free and requires no payment card. AI use is limited to 50 requests per verified user per UTC day and 1,000 requests across the service per UTC day. Availability and limits may change. No paid subscription or checkout is active.'],
    ['Commercial terms', 'Dodo Payments is the intended future payment provider. Prices shown on the site are indicative and do not create an order, invoice, or entitlement.'],
  ]},
  cookies: { title: 'Cookie notice', intro: 'How the pilot uses browser storage and measurement tools.', sections: [
    ['Essential storage', 'The app uses essential browser storage for signed-in sessions and browser-only preview data. These are needed for the service to work.'],
    ['Optional telemetry', 'Sentry is configured only when a deployment provides its public DSN. It is configured to avoid sending direct personal identifiers, source content, credentials, or file data.'],
    ['Your choices', 'You can clear local browser storage or sign out. A production consent mechanism will be added before non-essential analytics or marketing cookies are enabled.'],
  ]},
  acceptable_use: { title: 'Acceptable use', intro: 'Use Copeit safely, lawfully, and with evidence ownership in mind.', sections: [
    ['Do not misuse the service', 'Do not upload malware, infringing material, secrets you are not authorized to share, or content intended to compromise the service or other users.'],
    ['Do not rely on unsupported conclusions', 'Do not treat an AI response as certification, legal advice, a regulatory decision, or permission to place a product on a market.'],
    ['Account security', 'Keep credentials private, use invited accounts only as authorized, and promptly report suspected compromise.'],
  ]},
  ai_limitations: { title: 'AI limitations', intro: 'What Ask Copeit can and cannot do.', sections: [
    ['Evidence first', 'When enabled, generated answers must be based on currently approved, permitted workspace evidence with citations. If evidence is missing or weak, the system should abstain.'],
    ['Human responsibility', 'Users and qualified reviewers remain responsible for verification, product decisions, regulatory interpretation, and submissions.'],
    ['No sensitive instructions', 'Uploaded text is treated as untrusted data. Users should not place passwords, API keys, or unnecessary sensitive information into questions or documents.'],
  ]},
  deletion: { title: 'Data deletion', intro: 'How a verified deletion request will be handled in the pilot.', sections: [
    ['Request process', 'Email the support contact below from your registered account to request deletion. Include your workspace name. We will verify your identity and authority before acting on the request.'],
    ['Target timeline', 'The provisional target is deletion of live customer data within 90 days after identity and authority are verified.'],
    ['Limits', 'Some records may be retained where legally required, to prevent abuse, or until encrypted/provider backup retention expires. The final policy will state the applicable periods and exceptions.'],
  ]},
  support: { title: 'Support', intro: 'Contact Copeit AI for help with your account or workspace.', sections: [
    ['Account and workspace help', 'Email the support contact below with a description of the problem and any error message. Response times are not guaranteed during the pilot.'],
    ['Before sharing information', 'Do not send credentials, payment details, regulated evidence, or unnecessary personal data through an unverified channel.'],
    ['Service status', 'A response-time commitment, escalation path, and status page remain to be established before general availability.'],
  ]},
  security: { title: 'Security contact', intro: 'How responsible security reporting will be handled.', sections: [
    ['Responsible disclosure', 'Do not exploit vulnerabilities, access another tenant’s data, or disrupt service. Preserve minimal evidence and report the issue privately.'],
    ['Current status', 'A public security contact and disclosure process must be configured before customer launch. Do not send sensitive reports through this page.'],
    ['Security baseline', 'The production gate requires tenant-isolation testing, secret rotation, least-privilege access, monitoring, backup/restore verification, and an independent security review.'],
  ]} };

export const trustPageKeys = Object.keys(pages);

export default function TrustPage({ pageKey, onBack, Logo }) {
  const page = pages[pageKey] || pages.privacy;
  return <main className="trust-page"><header className="trust-header"><Logo/><button onClick={onBack}><ArrowLeft size={16}/> Back to Copeit</button></header><article className="trust-content"><span className="app-eyebrow">COPEIT AI / PROVISIONAL POLICY</span><h1>{page.title}</h1><p className="trust-intro">{page.intro}</p><aside className="trust-notice"><ShieldCheck size={20}/><p>{policyNotice}</p></aside>{page.sections.map(([heading, body]) => <section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}<p>Contact support: <a href={`mailto:${supportEmail}`}>{supportEmail}</a></p><p className="trust-updated">Last updated: 30 October 2026 · Pilot policy status: provisional</p></article></main>;
}
