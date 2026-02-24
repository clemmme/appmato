/**
 * IBAN validation — pure client-side, no API needed.
 * Implements the ISO 13616-1 standard check (MOD 97-10).
 */

export interface IBANInfo {
    valid: boolean;
    formatted: string;
    country: string;
    countryCode: string;
    bankCode?: string;
    bban: string;
    length: number;
}

const COUNTRY_LENGTHS: Record<string, number> = {
    FR: 27, DE: 22, ES: 24, IT: 27, GB: 22, BE: 16, LU: 20, CH: 21,
    NL: 18, PT: 25, AT: 20, IE: 22, FI: 18, SE: 24, DK: 18, NO: 15,
    PL: 28, CZ: 24, HU: 28, RO: 24, BG: 22, HR: 21, GR: 27, SK: 24,
    SI: 19, EE: 20, LT: 20, LV: 21, MT: 31, CY: 28, MC: 27, SM: 27,
    AD: 24, LI: 21, IS: 26, MA: 28, TN: 24, DZ: 26, MU: 30, TR: 26,
};

const COUNTRY_NAMES: Record<string, string> = {
    FR: 'France', DE: 'Allemagne', ES: 'Espagne', IT: 'Italie', GB: 'Royaume-Uni',
    BE: 'Belgique', LU: 'Luxembourg', CH: 'Suisse', NL: 'Pays-Bas', PT: 'Portugal',
    AT: 'Autriche', IE: 'Irlande', FI: 'Finlande', SE: 'Suède', DK: 'Danemark',
    NO: 'Norvège', PL: 'Pologne', CZ: 'Tchéquie', HU: 'Hongrie', RO: 'Roumanie',
    BG: 'Bulgarie', HR: 'Croatie', GR: 'Grèce', SK: 'Slovaquie', SI: 'Slovénie',
    EE: 'Estonie', LT: 'Lituanie', LV: 'Lettonie', MT: 'Malte', CY: 'Chypre',
    MC: 'Monaco', SM: 'Saint-Marin', AD: 'Andorre', LI: 'Liechtenstein', IS: 'Islande',
    MA: 'Maroc', TN: 'Tunisie', DZ: 'Algérie', MU: 'Maurice', TR: 'Turquie',
};

const COUNTRY_FLAGS: Record<string, string> = {
    FR: '🇫🇷', DE: '🇩🇪', ES: '🇪🇸', IT: '🇮🇹', GB: '🇬🇧',
    BE: '🇧🇪', LU: '🇱🇺', CH: '🇨🇭', NL: '🇳🇱', PT: '🇵🇹',
    AT: '🇦🇹', IE: '🇮🇪', FI: '🇫🇮', SE: '🇸🇪', DK: '🇩🇰',
    NO: '🇳🇴', PL: '🇵🇱', CZ: '🇨🇿', HU: '🇭🇺', RO: '🇷🇴',
    BG: '🇧🇬', HR: '🇭🇷', GR: '🇬🇷', SK: '🇸🇰', SI: '🇸🇮',
    MA: '🇲🇦', TN: '🇹🇳', DZ: '🇩🇿', TR: '🇹🇷', MC: '🇲🇨',
};

function mod97(numStr: string): number {
    let remainder = 0;
    for (let i = 0; i < numStr.length; i++) {
        remainder = (remainder * 10 + parseInt(numStr[i])) % 97;
    }
    return remainder;
}

export function validateIBAN(raw: string): IBANInfo {
    const iban = raw.replace(/\s/g, '').toUpperCase();
    const countryCode = iban.substring(0, 2);
    const country = COUNTRY_NAMES[countryCode] || 'Inconnu';
    const formatted = iban.replace(/(.{4})/g, '$1 ').trim();
    const bban = iban.substring(4);

    const base: IBANInfo = {
        valid: false,
        formatted,
        country,
        countryCode,
        bban,
        length: iban.length,
    };

    // Check length
    const expectedLength = COUNTRY_LENGTHS[countryCode];
    if (!expectedLength || iban.length !== expectedLength) {
        return base;
    }

    // Check characters (only alphanumeric)
    if (!/^[A-Z0-9]+$/.test(iban)) {
        return base;
    }

    // MOD 97-10 check
    const rearranged = iban.substring(4) + iban.substring(0, 4);
    const numStr = rearranged.replace(/[A-Z]/g, (ch) => (ch.charCodeAt(0) - 55).toString());

    if (mod97(numStr) !== 1) {
        return base;
    }

    // Extract bank code for FR
    let bankCode: string | undefined;
    if (countryCode === 'FR') {
        bankCode = bban.substring(0, 5); // Code banque
    }

    return {
        ...base,
        valid: true,
        bankCode,
    };
}

export function getCountryFlag(code: string): string {
    return COUNTRY_FLAGS[code] || '🏳️';
}

export function getCountryName(code: string): string {
    return COUNTRY_NAMES[code] || 'Inconnu';
}
