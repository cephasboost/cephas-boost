# CEPHAS BOOST — version paiement Mobile Money

Plateforme Node/Express avec catalogue, création de commandes, suivi de paiement et architecture prête pour les intégrations officielles Orange Money, Airtel Money et M-Pesa RDC.

## Important
Cette version ne simule pas un paiement réussi. Tant que les identifiants marchands/API ne sont pas configurés, le paiement reste `CONFIG_REQUIRED`.

Les prix du catalogue sont des exemples : remplace-les par tes tarifs réels avant publication.

## Lancer en local
1. Installer Node.js 18+.
2. Copier `.env.example` vers `.env` et définir `ADMIN_KEY`.
3. `npm install`
4. `npm start`
5. Ouvrir `http://localhost:3000`.

## Mise en production
### Orange Money RDC
Orange Developer propose une API Orange Money pour permettre à un client de payer un produit/service sur un site ou une application. Le marchand doit obtenir l'accès et les identifiants selon le processus Orange.

### Airtel Money RDC
Le portail développeur Airtel permet de créer une application, tester les APIs puis demander l'accès production après conformité et approbation.

### M-Pesa RDC
Vodacom fournit un portail Open API avec C2B pour collecter les paiements des clients, ainsi que des APIs de statut de transaction. Un compte Business est requis pour la production.

Ne place jamais une clé secrète dans le navigateur ou dans le dépôt public.

## Webhooks
`POST /api/webhooks/orange`
`POST /api/webhooks/airtel`
`POST /api/webhooks/mpesa`

Le serveur contient une logique de statut normalisée, mais le connecteur de production doit vérifier la signature et adapter le format exact du webhook de chaque opérateur conformément à sa documentation actuelle.

## Admin / test
`GET /api/admin/orders` avec l'en-tête `x-admin-key`.

`POST /api/admin/payments/:id/mark-paid` est réservé au test manuel. Ne l'expose jamais publiquement et change `ADMIN_KEY` en production.

## Modèle économique
Le client paie un service sur CEPHAS BOOST. Le chiffre d'affaires brut est enregistré dans la commande; les frais Mobile Money et les coûts réels de prestation doivent être déduits pour calculer la marge nette.

L'exécution automatique auprès de fournisseurs tiers n'est pas activée dans cette version. Utilise uniquement des services de promotion conformes aux règles des plateformes sociales et aux lois applicables.
