
function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;
    const discountFactor = 1 - (discount / 100);
    const revenue = sale_price * quantity * discountFactor;
    return revenue;
}

function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;
    if (index === 0) {
        return profit * 0.15;
    } else if (index === 1 || index === 2) {
        return profit * 0.1;
    } else if (index === (total - 1)) {
        return 0;
    } else { 
        return profit * 0.05;
    }
}

function analyzeSalesData(data, options) {
    if (!data
    || !Array.isArray(data.sellers)
    || !Array.isArray(data.products)
    || !Array.isArray(data.purchase_records)
    || data.sellers.length === 0
    || data.products.length === 0
    || data.purchase_records.length === 0
    ) {
    throw new Error('Некорректные входные данные');
    } 

    const {
        calculateRevenue = calculateSimpleRevenue,
        calculateBonus = calculateBonusByProfit
    } = options || {};

    if (typeof calculateRevenue !== 'function') {
        throw new Error('calculateRevenue должна быть функцией');
    }
    if (typeof calculateBonus !== 'function') {
        throw new Error('calculateBonus должна быть функцией');
    }

    const sellerStats = data.sellers.map(seller => {
        return {
        seller_id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
        }; 
    });

    const sellerIndex = sellerStats.reduce((acc, seller) => ({
        ...acc,
        [seller.seller_id]: seller
    }), {}); 

    const productIndex = data.products.reduce((acc, product) => ({
        ...acc,
        [product.sku]: product
    }), {}); 

    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (seller) {
            seller.sales_count = (seller.sales_count || 0) + 1; 
            seller.revenue = (seller.revenue || 0) + (record.total_amount || 0);
        };

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (product && product.purchase_price) {
                let cost = (product.purchase_price || 0) * item.quantity;
                let revenue = calculateRevenue(item, product);
                let profit = revenue - cost;
                seller.profit = (seller.profit || 0) + profit;
            } 
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    sellerStats.sort((a, b) => b.profit - a.profit); 

    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);
        let productsMassive = Object.entries(seller.products_sold); 
        let resProductsMassive =  productsMassive.map(([sku, quantity]) => ({ sku, quantity }));
        resProductsMassive.sort((a, b) => b.quantity - a.quantity); 
        seller.top_products = resProductsMassive.slice(0, 10);
    }); 

    return sellerStats.map(seller => ({
        seller_id: seller.seller_id,
        name: seller.name,
        revenue: Number(seller.revenue.toFixed(2)),
        profit: Number(seller.profit.toFixed(2)),
        sales_count: seller.sales_count,
        bonus: Number(seller.bonus.toFixed(2)),
        top_products: seller.top_products
    })); 
}

