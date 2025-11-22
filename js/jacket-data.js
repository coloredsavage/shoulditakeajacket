/**
 * Jacket metadata for tooltips
 * Maps image filenames to brand and model information
 */

const jacketData = {
    // Male jackets
    "Aimé Leon Dore x Porsche 911SC Mechanic Jacket.png": {
        brand: "Aimé Leon Dore",
        model: "Porsche 911SC Mechanic Jacket",
        type: "medium"
    },
    "Alpha Industries Leather Flight Jacket.png": {
        brand: "Alpha Industries",
        model: "Leather Flight Jacket",
        type: "medium"
    },
    "Ben Davis Work Jacket Stripped.png": {
        brand: "Ben Davis",
        model: "Work Jacket Stripped",
        type: "medium"
    },
    "Black Wool Blousson Jacket.png": {
        brand: "Unknown",
        model: "Black Wool Blousson",
        type: "heavy"
    },
    "Carhartt WIP Detroit jacket.png": {
        brand: "Carhartt WIP",
        model: "Detroit Jacket",
        type: "medium"
    },
    "Days Ranger navy blue whipcord work jacket. .png": {
        brand: "Days Ranger",
        model: "Navy Blue Whipcord Work Jacket",
        type: "medium"
    },
    "KNOX Blue Navy Jacket.png": {
        brand: "KNOX",
        model: "Blue Navy Jacket",
        type: "medium"
    },
    "LOUECHY Men's Corduroy Trucker Jacket.png": {
        brand: "LOUECHY",
        model: "Corduroy Trucker Jacket",
        type: "light"
    },
    "O'Connell's Destroyer Goatskin Baracuta jacket .png": {
        brand: "O'Connell's",
        model: "Destroyer Goatskin Baracuta",
        type: "medium"
    },
    "Stray Rats Dickies Eisenhower Jacket.png": {
        brand: "Stray Rats x Dickies",
        model: "Eisenhower Jacket",
        type: "medium"
    },
    "Vintage Polo Ralph Lauren Navy Jacket.png": {
        brand: "Polo Ralph Lauren",
        model: "Vintage Navy Jacket",
        type: "medium"
    },

    // Female jackets
    "GAMIRA's Womens Coat.png": {
        brand: "GAMIRA",
        model: "Women's Coat",
        type: "heavy"
    },
    "H & M Denim Jacket.png": {
        brand: "H&M",
        model: "Denim Jacket",
        type: "light"
    },
    "J. Crew Merlot Majesty Peacoat.png": {
        brand: "J.Crew",
        model: "Merlot Majesty Peacoat",
        type: "heavy"
    },
    "Manokhi HANA Jacket.png": {
        brand: "Manokhi",
        model: "HANA Jacket",
        type: "medium"
    },
    "Micas Denim Metallic Button Outerwear.png": {
        brand: "Micas",
        model: "Denim Metallic Button Outerwear",
        type: "light"
    },
    "Miu Miu padded corduroy-collar blouson.png": {
        brand: "Miu Miu",
        model: "Padded Corduroy-Collar Blouson",
        type: "medium"
    },
    "Mos Mosh Wanda check pattern blaze.png": {
        brand: "Mos Mosh",
        model: "Wanda Check Pattern Blaze",
        type: "medium"
    },
    "ReSee Pre Fall 2021 Flared Trench.png": {
        brand: "ReSee",
        model: "Pre Fall 2021 Flared Trench",
        type: "heavy"
    },
    "TALISHKO Fur Line Up Zip Up.png": {
        brand: "TALISHKO",
        model: "Fur Line Up Zip Up",
        type: "heavy"
    },
    "Toogood The Skipper jacket.png": {
        brand: "Toogood",
        model: "The Skipper Jacket",
        type: "medium"
    },
    "Totême Embroidered Scarf Jacket.png": {
        brand: "Totême",
        model: "Embroidered Scarf Jacket",
        type: "medium"
    },
    "Zara houndstooth belted jacket.png": {
        brand: "Zara",
        model: "Houndstooth Belted Jacket",
        type: "medium"
    }
};

/**
 * Helper function to get jacket info from image element
 */
function getJacketInfo(imgElement) {
    const filename = imgElement.src.split('/').pop(); // Extract filename from src
    return jacketData[filename] || { brand: 'Unknown', model: 'Jacket', type: 'medium' };
}
