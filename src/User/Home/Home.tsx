import React, { useEffect, useState } from 'react';
import Category from './Category';
import CustomFurniture from './CustomFurniture';
import FeaturedCombos from './FeaturedCombos';
import Hero from './Hero';
import OfferBanners from './OfferBanners';
import Products from './Products';
import Reviews from './Reviews';
import ShopByRoom from './ShopByRoom';
import TopRatedProducts from './TopRatedProducts';
import type { StoreBanner, StoreCategory, StoreProduct } from '../types';

type HomeProps = {
  refreshKey?: number;
  categories: StoreCategory[];
  products: StoreProduct[];
  heroBanners: StoreBanner[];
  offerBanners: StoreBanner[];
  favorites: string[];
  onCategoryPress: (category: string) => void;
  onExplorePress: () => void;
  onRoomPress: (roomSlug: string) => void;
  onCustomFurniturePress: () => void;
  onFavoritePress: (productId: string) => void;
  onAddToCart: (productId: string) => void;
  onProductPress: (productId: string) => void;
};

export default function Home({
  refreshKey = 0,
  categories,
  products,
  heroBanners,
  offerBanners,
  favorites,
  onCategoryPress,
  onExplorePress,
  onRoomPress,
  onCustomFurniturePress,
  onFavoritePress,
  onAddToCart,
  onProductPress,
}: HomeProps) {
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    setHeroIndex(currentIndex =>
      heroBanners.length ? currentIndex % heroBanners.length : 0,
    );
  }, [heroBanners.length]);

  useEffect(() => {
    if (heroBanners.length < 2) return;

    const intervalId = setInterval(() => {
      setHeroIndex(currentIndex => (currentIndex + 1) % heroBanners.length);
    }, 4000);

    return () => clearInterval(intervalId);
  }, [heroBanners.length]);

  return (
    <>
      <Hero
        banners={heroBanners}
        activeIndex={heroIndex}
        onExplorePress={onExplorePress}
      />
      <Category
        categories={categories}
        onCategoryPress={onCategoryPress}
        onViewAllPress={onExplorePress}
      />
      <Products
        products={products}
        favorites={favorites}
        onFavoritePress={onFavoritePress}
        onAddToCart={onAddToCart}
        onProductPress={onProductPress}
      />
      <ShopByRoom refreshKey={refreshKey} onRoomPress={onRoomPress} />
      <TopRatedProducts
        products={products}
        favorites={favorites}
        onFavoritePress={onFavoritePress}
        onAddToCart={onAddToCart}
        onProductPress={onProductPress}
      />
      <OfferBanners banners={offerBanners} onShopPress={onExplorePress} />
      <FeaturedCombos
        refreshKey={refreshKey}
        favorites={favorites}
        onFavoritePress={onFavoritePress}
        onAddToCart={onAddToCart}
        onProductPress={onProductPress}
      />
      <CustomFurniture onRequestPress={onCustomFurniturePress} />
      <Reviews refreshKey={refreshKey} />
    </>
  );
}
