import { PageHeader } from "../../components/common/Container.jsx";
import ProductBrowser from "../../components/products/ProductBrowser.jsx";
import { useDocumentTitle } from "../../hooks/useCommon.js";

function Shop() {
    useDocumentTitle("Shop");
    return (
        <>
            <PageHeader label="THE COLLECTION" title="Shop all" description="Browse every piece in the store. Filter by category, price and availability." />
            <ProductBrowser emptyTitle="No products yet" emptyMessage="New pieces are on their way — check back soon." />
        </>
    );
}

export default Shop;
