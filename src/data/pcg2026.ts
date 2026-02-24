export interface AccountPCG {
    numero: string;
    libelle: string;
    classe: string;
}

export const pcg2026: AccountPCG[] = [
    // Classe 1 - Comptes de capitaux
    { numero: "10", libelle: "Capital et réserves", classe: "1" },
    { numero: "101", libelle: "Capital", classe: "1" },
    { numero: "106", libelle: "Réserves", classe: "1" },
    { numero: "108", libelle: "Compte de l'exploitant", classe: "1" },
    { numero: "11", libelle: "Report à nouveau (solde créditeur ou débiteur)", classe: "1" },
    { numero: "12", libelle: "Résultat de l'exercice (bénéfice ou perte)", classe: "1" },
    { numero: "16", libelle: "Emprunts et dettes assimilées", classe: "1" },
    { numero: "164", libelle: "Emprunts auprès des établissements de crédit", classe: "1" },

    // Classe 2 - Comptes d'immobilisations
    { numero: "20", libelle: "Immobilisations incorporelles", classe: "2" },
    { numero: "201", libelle: "Frais d'établissement", classe: "2" },
    { numero: "205", libelle: "Concessions et droits similaires, brevets, licences, logiciels", classe: "2" },
    { numero: "207", libelle: "Fonds commercial", classe: "2" },
    { numero: "21", libelle: "Immobilisations corporelles", classe: "2" },
    { numero: "211", libelle: "Terrains", classe: "2" },
    { numero: "213", libelle: "Constructions", classe: "2" },
    { numero: "215", libelle: "Installations techniques, matériels et outillage industriels", classe: "2" },
    { numero: "218", libelle: "Autres immobilisations corporelles", classe: "2" },
    { numero: "2182", libelle: "Matériel de transport", classe: "2" },
    { numero: "2183", libelle: "Matériel de bureau et matériel informatique", classe: "2" },
    { numero: "27", libelle: "Autres immobilisations financières", classe: "2" },
    { numero: "274", libelle: "Prêts", classe: "2" },
    { numero: "275", libelle: "Dépôts et cautionnements versés", classe: "2" },

    // Classe 3 - Comptes de stocks et en-cours
    { numero: "31", libelle: "Matières premières (et fournitures)", classe: "3" },
    { numero: "32", libelle: "Autres approvisionnements", classe: "3" },
    { numero: "35", libelle: "Stocks de produits", classe: "3" },
    { numero: "37", libelle: "Stocks de marchandises", classe: "3" },

    // Classe 4 - Comptes de tiers
    { numero: "40", libelle: "Fournisseurs et comptes rattachés", classe: "4" },
    { numero: "401", libelle: "Fournisseurs", classe: "4" },
    { numero: "404", libelle: "Fournisseurs d'immobilisations", classe: "4" },
    { numero: "408", libelle: "Fournisseurs - Factures non parvenues", classe: "4" },
    { numero: "41", libelle: "Clients et comptes rattachés", classe: "4" },
    { numero: "411", libelle: "Clients", classe: "4" },
    { numero: "418", libelle: "Clients - Produits non encore facturés", classe: "4" },
    { numero: "42", libelle: "Personnel et comptes rattachés", classe: "4" },
    { numero: "421", libelle: "Personnel - Rémunérations dues", classe: "4" },
    { numero: "428", libelle: "Personnel - Charges à payer et produits à recevoir", classe: "4" },
    { numero: "43", libelle: "Sécurité sociale et autres organismes sociaux", classe: "4" },
    { numero: "431", libelle: "Sécurité sociale", classe: "4" },
    { numero: "437", libelle: "Autres organismes sociaux", classe: "4" },
    { numero: "44", libelle: "État et autres collectivités publiques", classe: "4" },
    { numero: "444", libelle: "État - Impôts sur les bénéfices", classe: "4" },
    { numero: "445", libelle: "État - Taxes sur le chiffre d'affaires (TVA)", classe: "4" },
    { numero: "4456", libelle: "TVA déductible", classe: "4" },
    { numero: "4457", libelle: "TVA collectée", classe: "4" },
    { numero: "45", libelle: "Groupe et associés", classe: "4" },
    { numero: "455", libelle: "Associés - Comptes courants", classe: "4" },
    { numero: "46", libelle: "Débiteurs divers et créditeurs divers", classe: "4" },
    { numero: "47", libelle: "Comptes transitoires ou d'attente", classe: "4" },

    // Classe 5 - Comptes financiers
    { numero: "50", libelle: "Valeurs mobilières de placement", classe: "5" },
    { numero: "51", libelle: "Banques, établissements financiers et assimilés", classe: "5" },
    { numero: "512", libelle: "Banques", classe: "5" },
    { numero: "53", libelle: "Caisse", classe: "5" },
    { numero: "58", libelle: "Virements internes", classe: "5" },

    // Classe 6 - Comptes de charges
    { numero: "60", libelle: "Achats", classe: "6" },
    { numero: "601", libelle: "Achats stockés - Matières premières", classe: "6" },
    { numero: "604", libelle: "Achats d'études et prestations de services", classe: "6" },
    { numero: "606", libelle: "Achats non stockés de matière et fournitures", classe: "6" },
    { numero: "607", libelle: "Achats de marchandises", classe: "6" },
    { numero: "61", libelle: "Services extérieurs", classe: "6" },
    { numero: "613", libelle: "Locations", classe: "6" },
    { numero: "615", libelle: "Entretien et réparations", classe: "6" },
    { numero: "616", libelle: "Primes d'assurances", classe: "6" },
    { numero: "62", libelle: "Autres services extérieurs", classe: "6" },
    { numero: "622", libelle: "Rémunérations d'intermédiaires et honoraires", classe: "6" },
    { numero: "623", libelle: "Publicité, publications, relations publiques", classe: "6" },
    { numero: "625", libelle: "Déplacements, missions et réceptions", classe: "6" },
    { numero: "626", libelle: "Frais postaux et de télécommunications", classe: "6" },
    { numero: "627", libelle: "Services bancaires et assimilés", classe: "6" },
    { numero: "63", libelle: "Impôts, taxes et versements assimilés", classe: "6" },
    { numero: "635", libelle: "Autres impôts et taxes", classe: "6" },
    { numero: "64", libelle: "Charges de personnel", classe: "6" },
    { numero: "641", libelle: "Rémunérations du personnel", classe: "6" },
    { numero: "645", libelle: "Charges de sécurité sociale et de prévoyance", classe: "6" },
    { numero: "65", libelle: "Autres charges de gestion courante", classe: "6" },
    { numero: "66", libelle: "Charges financières", classe: "6" },
    { numero: "661", libelle: "Charges d'intérêts", classe: "6" },

    // Modifications PCG 2026 : Section Exceptionnelle Restreinte
    { numero: "67", libelle: "Charges exceptionnelles", classe: "6" },
    { numero: "671", libelle: "Charges exceptionnelles sur opérations de gestion (restreint PCG 2026)", classe: "6" },
    { numero: "68", libelle: "Dotations aux amortissements, dépréciations et provisions", classe: "6" },
    { numero: "681", libelle: "Dotations d'exploitation", classe: "6" },
    // Note PCG 2026 : Le compte 79 n'est plus utilisé pour les transferts de charges, ils sont directement crédités aux comptes de charges concernés.

    // Classe 7 - Comptes de produits
    { numero: "70", libelle: "Ventes de produits fabriqués, prestations de services, marchandises", classe: "7" },
    { numero: "701", libelle: "Ventes de produits finis", classe: "7" },
    { numero: "704", libelle: "Travaux", classe: "7" },
    { numero: "706", libelle: "Prestations de services", classe: "7" },
    { numero: "707", libelle: "Ventes de marchandises", classe: "7" },
    { numero: "708", libelle: "Produits des activités annexes", classe: "7" },
    { numero: "74", libelle: "Subventions d'exploitation", classe: "7" },
    { numero: "75", libelle: "Autres produits de gestion courante", classe: "7" },
    { numero: "76", libelle: "Produits financiers", classe: "7" },

    // Modifications PCG 2026 : Résultat Exceptionnel limité aux évènements majeurs et inhabituels
    { numero: "77", libelle: "Produits exceptionnels (restreint PCG 2026)", classe: "7" },
    { numero: "78", libelle: "Reprises sur amortissements, dépréciations et provisions", classe: "7" },
    { numero: "781", libelle: "Reprises d'exploitation", classe: "7" },
];
