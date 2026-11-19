import React, { useEffect, useState } from 'react';
import Category from './Category';
import CustomFurniture from './CustomFurniture';
import Hero from './Hero';
import OfferBanners from './OfferBanners';
import Products from './Products';
import ShopByRoom from './ShopByRoom';
import TopRatedProducts from './TopRatedProducts';
import type { StoreBanner, StoreCategory, StoreProduct } from '../types';

type HomeProps = {
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
};

export default function Home({
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
        onIndexChange={setHeroIndex}
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
      />
      <TopRatedProducts
        products={products}
        favorites={favorites}
        onFavoritePress={onFavoritePress}
        onAddToCart={onAddToCart}
      />
      <ShopByRoom onRoomPress={onRoomPress} />
      <CustomFurniture onRequestPress={onCustomFurniturePress} />
      <OfferBanners banners={offerBanners} onShopPress={onExplorePress} />
    </>
  );
}
