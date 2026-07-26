// PDF Export utility for reports — uses window.print() with styled HTML

const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const baseStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 40px; font-size: 12px; background: #fff; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
  .header-brand { display: flex; align-items: center; gap: 12px; }
  .brand-logo { width: 40px; height: 40px; background: #2563eb; border-radius: 10px; color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; }
  .brand-text { font-size: 18px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
  .header-meta { text-align: right; font-size: 10px; color: #64748b; }
  h1 { font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 4px; text-transform: uppercase; letter-spacing: -0.5px; }
  .subtitle { font-size: 14px; font-weight: 800; color: #3b82f6; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 2px; }
  hr { border: none; border-top: 2px solid #e2e8f0; margin: 24px 0; }
  hr.dashed { border-top: 2px dashed #cbd5e1; }
  h2 { font-size: 14px; font-weight: 800; color: #0f172a; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 1px; }
  
  .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .metric-box { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; font-size: 11px; background: #f8fafc; }
  .metric-box.highlight { background: #eff6ff; border-color: #bfdbfe; }
  .metric-label { font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; margin-bottom: 6px; display: block; }
  .metric-value { font-size: 18px; font-weight: 800; color: #0f172a; }
  .metric-value.positive { color: #10b981; }
  .metric-value.negative { color: #ef4444; }
  
  table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 24px; font-size: 10px; }
  th { background: #f1f5f9; text-align: left; padding: 12px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #e2e8f0; }
  th:first-child { border-top-left-radius: 8px; border-bottom-left-radius: 8px; }
  th:last-child { border-top-right-radius: 8px; border-bottom-right-radius: 8px; }
  td { padding: 12px; border-bottom: 1px solid #f1f5f9; color: #334155; font-weight: 600; }
  tr:last-child td { border-bottom: none; }
  th.right, td.right { text-align: right; }
  .value-cell { font-family: monospace; font-size: 11px; }
  
  .agency-box { border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 20px; page-break-inside: avoid; background: white; }
  .agency-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 16px; }
  .agency-name { color: #0f172a; font-size: 16px; font-weight: 800; }
  .agency-summary { font-size: 10px; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
  
  .agency-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .agency-metric { padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9; }
  .solde-box { background: #0f172a; color: white; padding: 16px; border-radius: 12px; margin-top: 16px; display: flex; justify-content: space-between; align-items: center; }
  .solde-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 800; color: #94a3b8; }
  .solde-value { font-size: 20px; font-weight: 800; }
  .solde-value.positive { color: #10b981; }
  .solde-value.negative { color: #ef4444; }
  
  .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
  .footer-title { font-size: 11px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
  .footer-sub { font-size: 9px; color: #94a3b8; margin-top: 6px; }
  @media print { body { padding: 0; } }
`;

const now = () => {
    const d = new Date();
    return { date: d.toLocaleDateString('fr-FR'), time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), full: `${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` };
};

const headerHtml = (t: any) => `
  <div class="header">
    <div class="header-brand">
      <img src="${window.location.origin}/logo.png" alt="Logo" style="width: 40px; height: 40px; object-fit: contain; border-radius: 8px;" />
      <div class="brand-text">BLD Trans</div>
    </div>
    <div class="header-meta">
      <div>Généré le ${t.date} à ${t.time}</div>
      <div>Document Officiel</div>
    </div>
  </div>
`;

const footerHtml = () => `
  <div class="footer">
    <div class="footer-title">BLD Services - Système de Transfert d'Argent</div>
    <div class="footer-sub">Document généré automatiquement</div>
  </div>
`;

function openPrintWindow(html: string) {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Impression Rapport</title><style>${baseStyles}</style></head><body>${html}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
}

// ===== DAILY =====
export interface DailyPdfData {
    agencyName: string | null; // null = toutes
    date: string;
    report: number; services: number; envois: number; depenses: number;
    mouvPlus: number; mouvMinus: number; solde: number; revenuNet: number;
    totalEnvoisMontant: number; totalServicesMontant: number;
    transactions: { code: string; montant: number; frais: number; expediteur: string; destinataire: string; agent: string; type: 'envoi' | 'service' }[];
    agenciesDetail?: {
        name: string; report: number; envois: number; services: number;
        depenses: number; mouvPlus: number; mouvMinus: number; solde: number;
        nbEnvois: number; nbServices: number;
    }[];
}

export function exportDailyPdf(d: DailyPdfData) {
    const t = now();
    const title = d.agencyName ? `Agence : ${d.agencyName}` : 'TOUTES LES AGENCES';
    const envoisList = d.transactions.filter(t => t.type === 'envoi');
    const servicesList = d.transactions.filter(t => t.type === 'service');

    let html = `
    ${headerHtml(t)}
    <h1>Rapport Journalier - Synthèse du ${new Date(d.date).toLocaleDateString('fr-FR')}</h1>
    <p class="subtitle">${title}</p>
    <hr/>
    <h2>Aperçu des Performances Financières</h2>
    <div class="metrics-grid">
      <div class="metric-box"><span class="metric-label">Report de la veille</span><span class="metric-value">${fmt(d.report)} $</span></div>
      <div class="metric-box highlight"><span class="metric-label">Total des Envois</span><span class="metric-value">${fmt(d.totalEnvoisMontant)} $</span></div>
      <div class="metric-box highlight"><span class="metric-label">Total des Services</span><span class="metric-value">${fmt(d.totalServicesMontant)} $</span></div>
      <div class="metric-box"><span class="metric-label">Dépenses</span><span class="metric-value negative">-${fmt(d.depenses)} $</span></div>
      <div class="metric-box"><span class="metric-label">Mouvements +</span><span class="metric-value positive">+${fmt(d.mouvPlus)} $</span></div>
      <div class="metric-box"><span class="metric-label">Mouvements -</span><span class="metric-value negative">-${fmt(d.mouvMinus)} $</span></div>
      <div class="metric-box highlight"><span class="metric-label">Revenu Net</span><span class="metric-value positive">${fmt(d.revenuNet)} $</span></div>
      <div class="metric-box" style="background:#0f172a;border:none;"><span class="metric-label" style="color:#94a3b8">Solde en Main</span><span class="metric-value" style="color:white">${fmt(d.solde)} $</span></div>
    </div>`;

    if (d.agenciesDetail && d.agenciesDetail.length > 0) {
        html += `<hr class="dashed"/><h2>Détails par Agence</h2>`;
        for (const a of d.agenciesDetail) {
            html += `
        <div class="agency-box">
          <div class="agency-header">
            <div class="agency-name">${a.name}</div>
            <div class="agency-summary">${a.nbEnvois} Envois · ${a.nbServices} Services</div>
          </div>
          <div class="agency-metrics">
            <div class="agency-metric"><span class="metric-label">Report</span><span class="metric-value">${fmt(a.report)} $</span></div>
            <div class="agency-metric"><span class="metric-label">Envois</span><span class="metric-value positive">${fmt(a.envois)} $</span></div>
            <div class="agency-metric"><span class="metric-label">Services</span><span class="metric-value negative">-${fmt(a.services)} $</span></div>
            <div class="agency-metric"><span class="metric-label">Dépenses</span><span class="metric-value negative">-${fmt(a.depenses)} $</span></div>
            <div class="agency-metric"><span class="metric-label">Mouvements +</span><span class="metric-value positive">+${fmt(a.mouvPlus)} $</span></div>
            <div class="agency-metric"><span class="metric-label">Mouvements -</span><span class="metric-value negative">-${fmt(a.mouvMinus)} $</span></div>
          </div>
          <div class="solde-box">
            <span class="solde-label">Solde en Main Final</span>
            <span class="solde-value ${a.solde >= 0 ? 'positive' : 'negative'}">${fmt(a.solde)} $</span>
          </div>
        </div>`;
        }
    } else {
        const renderTable = (rows: typeof d.transactions) => rows.length === 0 ? '<p style="color:#94a3b8;font-size:11px;font-style:italic;">Aucune transaction enregistrée</p>' : `
      <table><thead><tr><th>Code</th><th class="right">Montant</th><th class="right">Frais</th><th>Expéditeur</th><th>Destinataire</th><th>Agent envoi/service</th></tr></thead>
      <tbody>${rows.map(r => `<tr><td><strong>${r.code}</strong></td><td class="right value-cell">${fmt(r.montant)} $</td><td class="right value-cell">${fmt(r.frais)} $</td><td>${r.expediteur}</td><td>${r.destinataire}</td><td>${r.agent}</td></tr>`).join('')}</tbody></table>`;
        html += `<hr class="dashed"/>
      <h2>Envois Sortants (${envoisList.length})</h2>${renderTable(envoisList)}
      <h2>Services Payés (${servicesList.length})</h2>${renderTable(servicesList)}`;
    }
    html += footerHtml();
    openPrintWindow(html);
}

// ===== WEEKLY =====
export interface WeeklyPdfData {
    agencyName: string | null;
    dateFrom: string; dateTo: string;
    envois: number; services: number; frais: number; depenses: number; revenuNet: number; tauxService: number;
    nbEnvois: number; nbServices: number;
    agenciesRanking?: { rang: number; name: string; nbOps: number; volume: number; revenu: number }[];
}

export function exportWeeklyPdf(d: WeeklyPdfData) {
    const t = now();
    const title = d.agencyName ? `Agence : ${d.agencyName}` : 'Toutes les agences';
    let html = `
    ${headerHtml(t)}
    <h1>Rapport Hebdomadaire - Du ${new Date(d.dateFrom).toLocaleDateString('fr-FR')} au ${new Date(d.dateTo).toLocaleDateString('fr-FR')}</h1>
    <p class="subtitle">${title}</p>
    <hr/>
    <h2>Aperçu des Performances Hebdomadaires</h2>
    <div class="metrics-grid">
      <div class="metric-box highlight"><span class="metric-label">Volume Envois</span><span class="metric-value">${fmt(d.envois)} $</span></div>
      <div class="metric-box highlight"><span class="metric-label">Volume Services</span><span class="metric-value">${fmt(d.services)} $</span></div>
      <div class="metric-box"><span class="metric-label">Frais Collectés</span><span class="metric-value positive">${fmt(d.frais)} $</span></div>
      <div class="metric-box"><span class="metric-label">Dépenses</span><span class="metric-value negative">-${fmt(d.depenses)} $</span></div>
      <div class="metric-box highlight"><span class="metric-label">Revenu Net</span><span class="metric-value positive">${fmt(d.revenuNet)} $</span></div>
      <div class="metric-box"><span class="metric-label">Taux de Service</span><span class="metric-value">${d.tauxService.toFixed(1)}%</span></div>
    </div>
    <hr class="dashed"/>
    <h2>Statistiques Détaillées</h2>
    <table><thead><tr><th>Métrique</th><th class="right">Montant</th><th class="right">Nombre d'opérations</th></tr></thead>
    <tbody>
      <tr><td><strong>Total Envois</strong></td><td class="right value-cell">${fmt(d.envois)} $</td><td class="right">${d.nbEnvois}</td></tr>
      <tr><td><strong>Total Services</strong></td><td class="right value-cell">${fmt(d.services)} $</td><td class="right">${d.nbServices}</td></tr>
      <tr><td><strong>Frais Collectés</strong></td><td class="right value-cell positive">${fmt(d.frais)} $</td><td class="right">-</td></tr>
      <tr><td><strong>Total Dépenses</strong></td><td class="right value-cell negative">-${fmt(d.depenses)} $</td><td class="right">-</td></tr>
      <tr><td style="color:#2563eb;"><strong>Revenu Net</strong></td><td class="right value-cell" style="color:#2563eb;font-weight:800;font-size:14px;">${fmt(d.revenuNet)} $</td><td class="right">-</td></tr>
    </tbody></table>`;
    
    if (d.agenciesRanking && d.agenciesRanking.length > 0) {
        html += `<hr class="dashed"/><h2>Classement des Agences</h2>
      <table><thead><tr><th>Rang</th><th>Agence</th><th class="right">Opérations</th><th class="right">Volume Total</th><th class="right">Revenu</th></tr></thead>
      <tbody>${d.agenciesRanking.map(a => `<tr><td><strong>#${a.rang}</strong></td><td><strong>${a.name}</strong></td><td class="right">${a.nbOps}</td><td class="right value-cell">${fmt(a.volume)} $</td><td class="right value-cell ${a.revenu >= 0 ? 'positive' : 'negative'}">${fmt(a.revenu)} $</td></tr>`).join('')}</tbody></table>`;
    }
    html += footerHtml();
    openPrintWindow(html);
}

// ===== MONTHLY =====
export interface MonthlyPdfData {
    agencyName: string | null;
    monthLabel: string;
    envois: number; services: number; frais: number; depenses: number;
    revenuNet: number; tauxService: number; margeNette: number; moyenneTransaction: number;
    nbEnvois: number; nbServices: number; nbTotal: number;
    agenciesRanking?: { position: number; name: string; volume: number; services: number; resultat: number; performance: string }[];
}

export function exportMonthlyPdf(d: MonthlyPdfData) {
    const t = now();
    const title = d.agencyName ? `Agence : ${d.agencyName}` : 'Toutes les agences';
    let html = `
    ${headerHtml(t)}
    <h1>Rapport Mensuel - ${d.monthLabel}</h1>
    <p class="subtitle">${title}</p>
    <hr/>
    <h2>Aperçu des Performances Mensuelles</h2>
    <div class="metrics-grid">
      <div class="metric-box highlight"><span class="metric-label">Volume Envois</span><span class="metric-value">${fmt(d.envois)} $</span></div>
      <div class="metric-box highlight"><span class="metric-label">Volume Services</span><span class="metric-value">${fmt(d.services)} $</span></div>
      <div class="metric-box"><span class="metric-label">Frais Collectés</span><span class="metric-value positive">${fmt(d.frais)} $</span></div>
      <div class="metric-box"><span class="metric-label">Dépenses</span><span class="metric-value negative">-${fmt(d.depenses)} $</span></div>
      <div class="metric-box highlight"><span class="metric-label">Revenu Net</span><span class="metric-value positive">${fmt(d.revenuNet)} $</span></div>
      <div class="metric-box"><span class="metric-label">Taux de Service</span><span class="metric-value">${d.tauxService.toFixed(1)}%</span></div>
      <div class="metric-box"><span class="metric-label">Marge Nette</span><span class="metric-value">${d.margeNette.toFixed(1)}%</span></div>
      <div class="metric-box"><span class="metric-label">Moy. par Transaction</span><span class="metric-value">${fmt(d.moyenneTransaction)} $</span></div>
    </div>
    <hr class="dashed"/>
    <h2>Analyse Détaillée</h2>
    <table><thead><tr><th>Indicateur</th><th class="right">Valeur</th><th>Détail Opérationnel</th></tr></thead>
    <tbody>
      <tr><td><strong>Volume d'Affaires</strong></td><td class="right value-cell">${fmt(d.envois + d.services)} $</td><td>${d.nbTotal} transactions globales</td></tr>
      <tr><td><strong>Envois Sortants</strong></td><td class="right value-cell">${fmt(d.envois)} $</td><td>${d.nbEnvois} opérations</td></tr>
      <tr><td><strong>Services Payés</strong></td><td class="right value-cell">${fmt(d.services)} $</td><td>${d.nbServices} opérations</td></tr>
      <tr><td><strong>Frais Collectés</strong></td><td class="right value-cell positive">${fmt(d.frais)} $</td><td>Gains générés sur envois</td></tr>
      <tr><td><strong>Dépenses d'Exploitation</strong></td><td class="right value-cell negative">-${fmt(d.depenses)} $</td><td>Charges totales déclarées</td></tr>
      <tr><td style="color:#2563eb;"><strong>Résultat Net</strong></td><td class="right value-cell" style="color:#2563eb;font-weight:800;font-size:14px;">${fmt(d.revenuNet)} $</td><td>Marge effective : ${d.margeNette.toFixed(1)}%</td></tr>
    </tbody></table>`;
    
    if (d.agenciesRanking && d.agenciesRanking.length > 0) {
        html += `<hr class="dashed"/><h2>Classement des Agences</h2>
      <table><thead><tr><th>#</th><th>Agence</th><th class="right">Volume Généré</th><th class="right">Services Effectués</th><th class="right">Résultat Net</th><th>Performance</th></tr></thead>
      <tbody>${d.agenciesRanking.map(a => `<tr><td><strong>${a.position}</strong></td><td><strong>${a.name}</strong></td><td class="right value-cell">${fmt(a.volume)} $</td><td class="right value-cell">${fmt(a.services)} $</td><td class="right value-cell ${a.resultat >= 0 ? 'positive' : 'negative'}">${fmt(a.resultat)} $</td><td><span style="background:#f1f5f9;padding:4px 8px;border-radius:4px;font-weight:800;">${a.performance}</span></td></tr>`).join('')}</tbody></table>`;
    }
    html += footerHtml();
    openPrintWindow(html);
}

// ===== RECEIPT (TRANSACTION) =====
export interface ReceiptPdfData {
    code: string;
    montant: number;
    frais: number;
    expediteurName: string;
    destinataireName: string;
    agenceName: string;
    agentName: string;
    mPasse: string | null;
    dateOp: string;
    isServed: boolean;
}

export function exportReceiptPdf(d: ReceiptPdfData) {
    const t = now();
    const typeLabel = d.isServed ? "REÇU DE RETRAIT" : "REÇU D'ENVOI";
    
    let html = `
    ${headerHtml(t)}
    <h1>${typeLabel}</h1>
    <p class="subtitle">CODE RÉFÉRENCE: ${d.code}</p>
    <hr/>
    
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:24px; margin-bottom:24px; text-align:center;">
      <div style="font-size:12px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Montant ${d.isServed ? 'Retiré' : 'Envoyé'}</div>
      <div style="font-size:36px; font-weight:900; color:#1e293b;">${fmt(d.montant)} $</div>
    </div>

    <h2>Détails de l'Opération</h2>
    <table>
      <tbody>
        <tr><td><strong>Expéditeur</strong></td><td class="right value-cell">${d.expediteurName}</td></tr>
        <tr><td><strong>Bénéficiaire</strong></td><td class="right value-cell">${d.destinataireName}</td></tr>
        <tr><td><strong>Agence</strong></td><td class="right value-cell">${d.agenceName}</td></tr>
        <tr><td><strong>Agent ${d.isServed ? 'Payeur' : 'Expéditeur'}</strong></td><td class="right value-cell">${d.agentName}</td></tr>
        ${!d.isServed && d.mPasse ? `<tr><td><strong>Mot de passe / PIN</strong></td><td class="right value-cell">${d.mPasse}</td></tr>` : ''}
        <tr><td><strong>Date de l'opération</strong></td><td class="right value-cell">${new Date(d.dateOp).toLocaleString('fr-FR')}</td></tr>
      </tbody>
    </table>

    ${!d.isServed ? `
    <hr class="dashed"/>
    <h2>Informations Financières</h2>
    <table>
      <tbody>
        <tr><td><strong>Frais Réseau</strong></td><td class="right value-cell positive">${fmt(d.frais)} $</td></tr>
        <tr><td style="color:#2563eb;"><strong>Total Payé par l'Expéditeur</strong></td><td class="right value-cell" style="color:#2563eb;font-weight:800;font-size:14px;">${fmt(d.montant + d.frais)} $</td></tr>
      </tbody>
    </table>
    ` : ''}

    <div style="margin-top:60px; display:flex; justify-content:space-between;">
      <div style="width:45%; text-align:center; padding-top:15px; border-top:1px solid #e2e8f0;">
        <strong style="color:#64748b; font-size:11px; text-transform:uppercase; letter-spacing:1px;">Signature du Client</strong>
      </div>
      <div style="width:45%; text-align:center; padding-top:15px; border-top:1px solid #e2e8f0;">
        <strong style="color:#64748b; font-size:11px; text-transform:uppercase; letter-spacing:1px;">Cachet / Signature Agence</strong>
      </div>
    </div>
    
    ${footerHtml()}
    `;
    
    openPrintWindow(html);
}
