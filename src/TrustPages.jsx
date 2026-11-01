import React from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

const policyNotice = 'This is a provisional v1 policy page. It is not legal advice and must be replaced or approved by qualified counsel before customer onboarding or paid access.';

const pages = {
  privacy: { title: 'Privacy notice', intro: 'How Copeit AI intends to handle personal and workspace data during the pilot.', sections: [
    ['What we collect', 'Account details, workspace records, support correspondence, security logs, and only the files a permitted user uploads. Copeit does not accept customer files until the private evidence controls are enabled and reviewed.'],
    ['Why we use it', 'To provide the workspace, protect accounts, investigate incidents, support users, and meet legal obligations. Copeit does not sell personal data.'],
    ['EU-first posture', 'The intended production posture is EU-first data hosting. Any international transfer, subprocessor, or data-region change requires a documented review before production use.'],
    ['Retention and deletion', 'Verified deletion requests target removal of live customer data within 90 days. Backup copies may persist until their provider-managed retention cycle ends; Copeit will not promise a shorter backup deletion period than it can verify.'],
  ]},
  terms: { title: 'Terms of service', intro: 'The provisional rules for using the Copeit AI pilot.', sections: [
    ['Service scope', 'Copeit organizes product context, evidence workflows, and source-grounded assistance. It does not certify products, determine market access, provide legal advice, or replace qualified regulatory review.'],
    ['Your responsibilities', 'You must have rights to upload material, protect account access, verify decisions with qualified professionals, and not use the service for unlawful or harmful activity.'],
    ['Pilot availability', 'Features, availability, storage limits, and support are pilot-stage and may change. No paid subscription or checkout is active in this release.'],
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
    ['Request process', 'Before customer onboarding, Copeit will publish a verified support contact and request form. Until then, do not submit personal data through this public page.'],
    ['Target timeline', 'The provisional target is deletion of live customer data within 90 days after identity and authority are verified.'],
    ['Limits', 'Some records may be retained where legally required, to prevent abuse, or until encrypted/provider backup retention expires. The final policy will state the applicable periods and exceptions.'],
  ]},
  support: { title: 'Support', intro: 'How support will work during the controlled pilot.', sections: [
    ['Pilot support', 'Support is limited to invited pilot users and the agreed written scope. Public customer support channels are not yet operational.'],
    ['Before sharing information', 'Do not send credentials, payment details, regulated evidence, or unnecessary personal data through an unverified channel.'],
    ['Launch requirement', 'A verified support email, response-time commitment, escalation path, and status page are required before general availability.'],
  ]},
  security: { title: 'Security contact', intro: 'How responsible security reporting will be handled.', sections: [
    ['Responsible disclosure', 'Do not exploit vulnerabilities, access another tenant’s data, or disrupt service. Preserve minimal evidence and report the issue privately.'],
    ['Current status', 'A public security contact and disclosure process must be configured before customer launch. Do not send sensitive reports through this page.'],
    ['Security baseline', 'The production gate requires tenant-isolation testing, secret rotation, least-privilege access, monitoring, backup/restore verification, and an independent security review.'],
  ]},
};

export const trustPageKeys = Object.keys(pages);

export default function TrustPage({ pageKey, onBack, Logo }) {
  const page = pages[pageKey] || pages.privacy;
  return <main className="trust-page"><header className="trust-header"><Logo/><button onClick={onBack}><ArrowLeft size={16}/> Back to Copeit</button></header><article className="trust-content"><span className="app-eyebrow">COPEIT AI / PROVISIONAL POLICY</span><h1>{page.title}</h1><p className="trust-intro">{page.intro}</p><aside className="trust-notice"><ShieldCheck size={20}/><p>{policyNotice}</p></aside>{page.sections.map(([heading, body]) => <section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}<p className="trust-updated">Last updated: 30 October 2026 · Pilot policy status: provisional</p></article></main>;
}
