import { Transfert, Depense, MouvementPlus, MouvementMinus, MouvementChange } from '../types';

export interface DualBalanceResult {
  soldeUsd: number;
  soldeLocal: number;
  equivTotalUsd: number;
  envoisUsdNet: number;
  envoisLocalNet: number;
  servicesUsdNet: number;
  servicesLocalNet: number;
  depensesUsd: number;
  depensesLocal: number;
  mouvPlusUsd: number;
  mouvMinusUsd: number;
  changeUsdDelta: number;
  changeLocalDelta: number;
  symbole: string;
  monnaie: string;
  taux: number;
}

export interface CalculateDualBalanceParams {
  openingBalanceUsd?: number;
  openingBalanceLocal?: number;
  envois?: Transfert[];
  services?: Transfert[];
  depenses?: Depense[];
  mouvementsPlus?: MouvementPlus[];
  mouvementsMinus?: MouvementMinus[];
  mouvementsChange?: MouvementChange[];
  tauxChange?: number;
  symbole?: string;
  monnaie?: string;
}

/**
 * Calcule le solde dual (USD et Monnaie locale) pour une agence ou l'ensemble du réseau.
 * Respecte la rétrocompatibilité stricte pour l'historique sans champs locaux.
 */
export function calculateDualBalance(params: CalculateDualBalanceParams): DualBalanceResult {
  const openingUsd = params.openingBalanceUsd || 0;
  const openingLocal = params.openingBalanceLocal || 0;
  const taux = params.tauxChange && params.tauxChange > 0 ? params.tauxChange : 1;
  const symbole = params.symbole || '';
  const monnaie = params.monnaie || '';

  // 1. Envois
  let envoisUsdNet = 0;
  let envoisLocalNet = 0;

  (params.envois || []).forEach((t) => {
    const recuUsd = t.envoi_recu_usd || 0;
    const recuLocal = t.envoi_recu_local || 0;
    const renduUsd = t.envoi_rendu_usd || 0;
    const renduLocal = t.envoi_rendu_local || 0;

    // Règle Legacy : Si aucun champ multi-devise n'est renseigné
    if (recuUsd === 0 && recuLocal === 0) {
      envoisUsdNet += (Number(t.montant) || 0) + (Number(t.frais) || 0);
    } else {
      envoisUsdNet += (recuUsd - renduUsd);
      envoisLocalNet += (recuLocal - renduLocal);
    }
  });

  // 2. Services
  let servicesUsdNet = 0;
  let servicesLocalNet = 0;

  (params.services || []).forEach((t) => {
    const donneUsd = t.service_donne_usd || 0;
    const donneLocal = t.service_donne_local || 0;
    const recuUsd = t.service_recu_usd || 0;
    const recuLocal = t.service_recu_local || 0;

    // Règle Legacy : Si aucun champ multi-devise n'est renseigné
    if (donneUsd === 0 && donneLocal === 0) {
      servicesUsdNet += Number(t.montant) || 0;
    } else {
      servicesUsdNet += (donneUsd - recuUsd);
      servicesLocalNet += (donneLocal - recuLocal);
    }
  });

  // 3. Dépenses
  let depensesUsd = 0;
  let depensesLocal = 0;

  (params.depenses || []).forEach((d) => {
    const montantLocal = Number(d.montant_local) || 0;
    const montantUsd = Number(d.montant) || 0;
    depensesUsd += montantUsd;
    depensesLocal += montantLocal;
  });

  // 4. Mouvements + et - (USD)
  let mouvPlusUsd = 0;
  (params.mouvementsPlus || []).forEach((m) => {
    mouvPlusUsd += Number(m.montant) || 0;
  });

  let mouvMinusUsd = 0;
  (params.mouvementsMinus || []).forEach((m) => {
    mouvMinusUsd += Number(m.montant) || 0;
  });

  // 5. Mouvements de change
  // sens = 'usd_vers_local': l'agence prend USD du client et donne Local -> +USD, -Local
  // sens = 'local_vers_usd': l'agence prend Local du client et donne USD -> -USD, +Local
  let changeUsdPlus = 0;   // local_vers_usd (reçoit USD)
  let changeUsdMinus = 0;  // usd_vers_local (donne USD)
  let changeLocalPlus = 0;  // usd_vers_local (reçoit Local)
  let changeLocalMinus = 0; // local_vers_usd (donne Local)

  (params.mouvementsChange || []).forEach((mc) => {
    const montantUsd = Number(mc.montant_usd) || 0;
    const montantLocal = Number(mc.montant_local) || 0;

    if (mc.sens === 'local_vers_usd') {
      changeUsdPlus += montantUsd;
      changeLocalMinus += montantLocal;
    } else if (mc.sens === 'usd_vers_local') {
      changeUsdMinus += montantUsd;
      changeLocalPlus += montantLocal;
    }
  });

  const changeUsdDelta = changeUsdPlus - changeUsdMinus;
  const changeLocalDelta = changeLocalPlus - changeLocalMinus;

  // Calculs finaux des soldes
  const soldeUsd = openingUsd + envoisUsdNet + mouvPlusUsd + changeUsdDelta - (servicesUsdNet + depensesUsd + mouvMinusUsd);
  const soldeLocal = openingLocal + envoisLocalNet + changeLocalDelta - (servicesLocalNet + depensesLocal);
  const equivTotalUsd = soldeUsd + (soldeLocal / taux);

  return {
    soldeUsd,
    soldeLocal,
    equivTotalUsd,
    envoisUsdNet,
    envoisLocalNet,
    servicesUsdNet,
    servicesLocalNet,
    depensesUsd,
    depensesLocal,
    mouvPlusUsd,
    mouvMinusUsd,
    changeUsdDelta,
    changeLocalDelta,
    symbole,
    monnaie,
    taux
  };
}
