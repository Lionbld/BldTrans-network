# Guide de Déploiement - BLD TRANS

Ce guide explique comment déployer l'application de gestion de réseau de transfert d'argent en production.

## 1. Préparation de Supabase

L'application repose sur une base de données PostgreSQL gérée par Supabase. Assurez-vous que les tables suivantes sont créées avec leurs politiques de sécurité (RLS) :

### Tables requises :
- `agence` : Succursales avec leurs limites.
- `agents` : Utilisateurs du système (agents, admins).
- `clients` : Expéditeurs et destinataires.
- `transferts` : Historique des transactions.
- `ville` : Liste des localisations.
- `daily_reports`, `depense`, `mouvementplus`, `mouvementminus` : Comptabilité.

### Fonctions RPC :
Assurez-vous d'avoir exécuté les scripts SQL suivants (disponibles dans le projet) :
1. `supabase_report_functions.sql` (Calculs de rapports).
2. `migration_agency_limits.sql` (Limites d'agence).

---

## 2. Configuration de l'Hébergement (Vercel, Netlify, etc.)

L'application est construite avec Vite et React. Elle peut être hébergée sur n'importe quel service de statiques.

### Variables d'Environnement :
Configurez les variables suivantes dans votre interface d'hébergement :
- `VITE_SUPABASE_URL` : L'URL de votre projet Supabase.
- `VITE_SUPABASE_ANON_KEY` : La clé SQL `anon` publique.

---

## 3. Construction pour la Production

Pour générer le dossier de production, exécutez la commande suivante :
```bash
npm run build
```
Les fichiers générés se trouveront dans le dossier `dist/`.

---

## 4. Sécurité (Checklist)

- [ ] **Mode Démo** : Désactivé (déjà fait dans le code).
- [ ] **Authentification** : Seuls les emails officiels doivent être autorisés dans Supabase Auth.
- [ ] **RLS** : Vérifiez que les agents ne peuvent voir que les transactions de leur agence (si nécessaire).

---
> [!NOTE]
> Ce guide est sujet à révision par l'utilisateur comme demandé.
