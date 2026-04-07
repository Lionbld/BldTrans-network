// PDF Export utility for reports — uses window.print() with styled HTML

const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const baseStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; padding: 40px; font-size: 12px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; font-size: 11px; color: #666; }
  h1 { text-align: center; font-size: 20px; font-weight: 700; margin: 16px 0 4px; }
  .subtitle { text-align: center; font-size: 14px; font-weight: 600; margin-bottom: 4px; }
  .gen-date { text-align: center; font-size: 10px; color: #888; margin-bottom: 16px; }
  hr { border: none; border-top: 2px solid #1a1a2e; margin: 16px 0; }
  hr.dashed { border-top: 2px dashed #ccc; }
  h2 { font-size: 14px; font-weight: 700; margin: 20px 0 12px; }
  .metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
  .metric-box { border: 1px solid #ccc; border-radius: 4px; padding: 12px 16px; font-size: 13px; }
  .metric-box strong { font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
  th { background: #f0f0f0; text-align: left; padding: 8px 12px; font-weight: 700; border: 1px solid #ddd; }
  th.right, td.right { text-align: right; }
  td { padding: 8px 12px; border: 1px solid #ddd; }
  .section-title { color: #2563eb; font-size: 13px; font-weight: 700; margin: 16px 0 8px; }
  .footer { text-align: center; font-size: 10px; color: #2563eb; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; }
  .footer-sub { text-align: center; font-size: 9px; color: #999; margin-top: 4px; }
  .agency-box { border: 1px solid #ddd; border-radius: 6px; padding: 16px; margin-bottom: 14px; page-break-inside: avoid; }
  .agency-name { color: #2563eb; font-size: 14px; font-weight: 700; margin-bottom: 10px; }
  .agency-metrics { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; font-size: 11px; }
  .agency-metrics > div { padding: 6px 8px; background: #f8f8f8; border-radius: 3px; }
  .solde-line { font-size: 13px; font-weight: 700; margin-top: 10px; }
  .agency-summary { font-size: 10px; color: #666; margin-top: 8px; }
  @media print { body { padding: 20px; } }
`;

const now = () => {
    const d = new Date();
    return { date: d.toLocaleDateString('fr-FR'), time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), full: `${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` };
};

const footer = () => `
  <div class="footer">BLD Services - Système de Transfert d'Argent</div>
  <div class="footer-sub">Document généré automatiquement</div>
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
    // For "toutes agences" mode
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
    <div class="header"><span>${t.date} ${t.time}</span><span>Impression Rapport</span></div>
    <h1>Rapport Journalier - Synthèse du ${new Date(d.date).toLocaleDateString('fr-FR')}</h1>
    <p class="subtitle">${title}</p>
    <p class="gen-date">Généré le ${t.full}</p>
    <hr/>
    <h2>Aperçu des Performances Financières</h2>
    <div class="metrics-grid">
      <div class="metric-box">Report de la veille : <strong>${fmt(d.report)} $</strong></div>
      <div class="metric-box">Total des Envois : <strong>${fmt(d.totalEnvoisMontant)} $</strong></div>
      <div class="metric-box">Total des Services : <strong>${fmt(d.totalServicesMontant)} $</strong></div>
      <div class="metric-box">Total des Dépenses : <strong>${fmt(d.depenses)} $</strong></div>
      <div class="metric-box">Mouvements + : <strong>${fmt(d.mouvPlus)} $</strong></div>
      <div class="metric-box">Mouvements - : <strong>${fmt(d.mouvMinus)} $</strong></div>
      <div class="metric-box">Solde en Main : <strong>${fmt(d.solde)} $</strong></div>
      <div class="metric-box">Revenu Net : <strong>${fmt(d.revenuNet)} $</strong></div>
    </div>`;

    if (d.agenciesDetail && d.agenciesDetail.length > 0) {
        html += `<hr class="dashed"/><h2>Détails par Agence</h2>`;
        for (const a of d.agenciesDetail) {
            html += `
        <div class="agency-box">
          <div class="agency-name">${a.name}</div>
          <div class="agency-metrics">
            <div>Report : ${fmt(a.report)} $</div><div>Envois : ${fmt(a.envois)} $</div><div>Services : ${fmt(a.services)} $</div>
            <div>Dépenses : ${fmt(a.depenses)} $</div><div>Mouvements + : ${fmt(a.mouvPlus)} $</div><div>Mouvements - : ${fmt(a.mouvMinus)} $</div>
          </div>
          <div class="solde-line">Solde en Main : ${fmt(a.solde)} $</div>
          <div class="agency-summary">${a.nbEnvois} envois · ${a.nbServices} services</div>
        </div>`;
        }
    } else {
        // Transaction details for single agency
        const renderTable = (rows: typeof d.transactions) => rows.length === 0 ? '<p style="color:#999;font-size:11px;">Aucune transaction</p>' : `
      <table><thead><tr><th>Code</th><th class="right">Montant ($)</th><th class="right">Frais ($)</th><th>Expéditeur</th><th>Destinataire</th><th>Agent Envoi</th></tr></thead>
      <tbody>${rows.map(r => `<tr><td>${r.code}</td><td class="right">${fmt(r.montant)}</td><td class="right">${fmt(r.frais)}</td><td>${r.expediteur}</td><td>${r.destinataire}</td><td>${r.agent}</td></tr>`).join('')}</tbody></table>`;
        html += `<hr class="dashed"/>
      <p class="section-title">Envois (${envoisList.length} Transactions)</p>${renderTable(envoisList)}
      <p class="section-title">Services (${servicesList.length} Transactions)</p>${renderTable(servicesList)}`;
    }
    html += footer();
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
    <div class="header"><span>${t.date} ${t.time}</span><span>Impression Rapport</span></div>
    <h1>Rapport Hebdomadaire - Synthèse du ${new Date(d.dateFrom).toLocaleDateString('fr-FR')} au ${new Date(d.dateTo).toLocaleDateString('fr-FR')}</h1>
    <p class="subtitle">${title}</p>
    <p class="gen-date">Généré le ${t.full}</p>
    <hr/>
    <h2>Aperçu des Performances Hebdomadaires</h2>
    <div class="metrics-grid">
      <div class="metric-box">Total des Envois : <strong>${fmt(d.envois)} $</strong></div>
      <div class="metric-box">Total des Services : <strong>${fmt(d.services)} $</strong></div>
      <div class="metric-box">Frais Collectés : <strong>${fmt(d.frais)} $</strong></div>
      <div class="metric-box">Total des Dépenses : <strong>${fmt(d.depenses)} $</strong></div>
      <div class="metric-box">Revenu Net : <strong>${fmt(d.revenuNet)} $</strong></div>
      <div class="metric-box">Taux de Service : <strong>${d.tauxService.toFixed(1)}%</strong></div>
    </div>
    <hr class="dashed"/>
    <h2>Statistiques Détaillées</h2>
    <table><thead><tr><th>Métrique</th><th class="right">Montant ($)</th><th class="right">Nombre</th></tr></thead>
    <tbody>
      <tr><td>Total Envois</td><td class="right">${fmt(d.envois)}</td><td class="right">${d.nbEnvois}</td></tr>
      <tr><td>Total Services</td><td class="right">${fmt(d.services)}</td><td class="right">${d.nbServices}</td></tr>
      <tr><td>Frais Collectés</td><td class="right">${fmt(d.frais)}</td><td class="right">-</td></tr>
      <tr><td>Total Dépenses</td><td class="right">${fmt(d.depenses)}</td><td class="right">-</td></tr>
      <tr><td><strong>Revenu Net</strong></td><td class="right"><strong>${fmt(d.revenuNet)}</strong></td><td class="right">-</td></tr>
    </tbody></table>`;
    if (d.agenciesRanking && d.agenciesRanking.length > 0) {
        html += `<hr class="dashed"/><h2>Classement des Agences</h2>
      <table><thead><tr style="background:#dbeafe"><th>Rang</th><th>Agence</th><th class="right">Nombre Opérations</th><th class="right">Volume Total ($)</th><th class="right">Revenu ($)</th></tr></thead>
      <tbody>${d.agenciesRanking.map(a => `<tr><td>${a.rang}</td><td>${a.name}</td><td class="right">${a.nbOps}</td><td class="right">${fmt(a.volume)}</td><td class="right">${fmt(a.revenu)}</td></tr>`).join('')}</tbody></table>`;
    }
    html += footer();
    openPrintWindow(html);
}

// ===== MONTHLY =====
export interface MonthlyPdfData {
    agencyName: string | null;
    monthLabel: string; // e.g. "Mars 2026"
    envois: number; services: number; frais: number; depenses: number;
    revenuNet: number; tauxService: number; margeNette: number; moyenneTransaction: number;
    nbEnvois: number; nbServices: number; nbTotal: number;
    agenciesRanking?: { position: number; name: string; volume: number; services: number; resultat: number; performance: string }[];
}

export function exportMonthlyPdf(d: MonthlyPdfData) {
    const t = now();
    const title = d.agencyName ? `Agence : ${d.agencyName}` : 'Toutes les agences';
    let html = `
    <div class="header"><span>${t.date} ${t.time}</span><span>Impression Rapport</span></div>
    <h1>Rapport Mensuel - Synthèse de ${d.monthLabel}</h1>
    <p class="subtitle">${title}</p>
    <p class="gen-date">Généré le ${t.full}</p>
    <hr/>
    <h2>Aperçu des Performances Mensuelles</h2>
    <div class="metrics-grid">
      <div class="metric-box">Total des Envois : <strong>${fmt(d.envois)} $</strong></div>
      <div class="metric-box">Total des Services : <strong>${fmt(d.services)} $</strong></div>
      <div class="metric-box">Frais Collectés : <strong>${fmt(d.frais)} $</strong></div>
      <div class="metric-box">Total des Dépenses : <strong>${fmt(d.depenses)} $</strong></div>
      <div class="metric-box">Revenu Net : <strong>${fmt(d.revenuNet)} $</strong></div>
      <div class="metric-box">Taux de Service : <strong>${d.tauxService.toFixed(1)}%</strong></div>
      <div class="metric-box">Marge Nette : <strong>${d.margeNette.toFixed(1)}%</strong></div>
      <div class="metric-box">Moyenne par Transaction : <strong>${fmt(d.moyenneTransaction)} $</strong></div>
    </div>
    <hr class="dashed"/>
    <h2>Analyse Détaillée</h2>
    <table><thead><tr><th>Indicateur</th><th class="right">Valeur</th><th>Détail</th></tr></thead>
    <tbody>
      <tr><td>Volume d'Affaires</td><td class="right">${fmt(d.envois + d.services)} $</td><td>${d.nbTotal} transactions</td></tr>
      <tr><td>Envois</td><td class="right">${fmt(d.envois)} $</td><td>${d.nbEnvois} opérations</td></tr>
      <tr><td>Services</td><td class="right">${fmt(d.services)} $</td><td>${d.nbServices} opérations</td></tr>
      <tr><td>Frais Collectés</td><td class="right">${fmt(d.frais)} $</td><td>-</td></tr>
      <tr><td>Dépenses</td><td class="right">${fmt(d.depenses)} $</td><td>-</td></tr>
      <tr><td><strong>Résultat Net</strong></td><td class="right"><strong>${fmt(d.revenuNet)} $</strong></td><td>Marge : ${d.margeNette.toFixed(1)}%</td></tr>
    </tbody></table>`;
    if (d.agenciesRanking && d.agenciesRanking.length > 0) {
        html += `<hr class="dashed"/><h2>Classement des Agences</h2>
      <table><thead><tr style="background:#dbeafe"><th>#</th><th>Agence</th><th class="right">Volume ($)</th><th class="right">Services ($)</th><th class="right">Résultat ($)</th><th>Performance</th></tr></thead>
      <tbody>${d.agenciesRanking.map(a => `<tr><td>${a.position}</td><td>${a.name}</td><td class="right">${fmt(a.volume)}</td><td class="right">${fmt(a.services)}</td><td class="right">${fmt(a.resultat)}</td><td>${a.performance}</td></tr>`).join('')}</tbody></table>`;
    }
    html += `<div class="footer">BLD Services - Système de Transfert d'Argent</div>
    <div class="footer-sub">Rapport Mensuel de Performance - ${d.monthLabel}</div>
    <div class="footer-sub">Document généré automatiquement</div>`;
    openPrintWindow(html);
}
