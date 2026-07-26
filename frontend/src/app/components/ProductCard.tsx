import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { fadeInUp, hoverLift } from "../../animations/variants";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Plus } from "lucide-react";

type Product = {
  id: number;
  name: string;
  price: number;
  stock: number;
  sku: string;
  imageUrl?: string;
};

type Props = {
  product: Product;
  inCart?: number;
  onOpenQty: (id: number) => void;
};

export function ProductCard({ product, inCart = 0, onOpenQty }: Props) {
  const stockStatus = product.stock < 10 ? "critical" : product.stock < 30 ? "low" : "healthy";
  const imgSrc =
    product.imageUrl ||
    `https://placehold.co/200x200/4f46e5/ffffff?text=${product.name[0]}`;

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-20%" }}
      className="cursor-pointer"
    >
      <motion.div
        variants={hoverLift}
        initial="rest"
        whileHover="hover"
        className="rounded-2xl"
      >
        <Card
          className={`group border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all relative overflow-hidden rounded-2xl flex flex-col ${product.stock === 0 ? "opacity-60" : ""}`}
          onClick={() => product.stock > 0 && onOpenQty(product.id)}
        >
      {inCart > 0 && (
        <div className="absolute top-2 right-2 z-10 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-black text-xs shadow-lg ring-4 ring-white">
          {inCart}
        </div>
      )}

      <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden relative">
        <img
          src={imgSrc}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-[2px] flex items-center justify-center">
            <Badge variant="destructive" className="px-3 py-1 text-xs font-black uppercase tracking-widest shadow-xl">
              Out of Stock
            </Badge>
          </div>
        )}
        {product.stock > 0 && product.stock < 10 && (
          <div className="absolute top-3 left-3">
            <Badge variant="destructive" className="text-[10px]">Low Stock</Badge>
          </div>
        )}
      </div>

      <CardContent className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-gray-900 line-clamp-2 leading-tight h-10 mb-1">{product.name}</h3>
          <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">{product.sku}</p>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-end justify-between">
            <p className="text-xl font-black text-indigo-600">${product.price.toFixed(2)}</p>
            <div className="text-right">
              <p
                className={`text-[10px] font-bold uppercase ${
                  stockStatus === "critical"
                    ? "text-red-500"
                    : stockStatus === "low"
                    ? "text-orange-500"
                    : "text-green-600"
                }`}
              >
                {product.stock} in stock
              </p>
            </div>
          </div>

          <Progress
            value={(product.stock / 150) * 100}
            className={`h-1.5 ${
              stockStatus === "critical"
                ? "[&>div]:bg-red-500"
                : stockStatus === "low"
                ? "[&>div]:bg-orange-500"
                : "[&>div]:bg-green-500"
            }`}
          />
        </div>
      </CardContent>

      <div className="absolute inset-x-0 bottom-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-white/95 backdrop-blur-sm border-t border-gray-100 flex gap-2">
        <Button
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-10 rounded-xl shadow-lg shadow-indigo-100 font-bold gap-2"
          disabled={product.stock === 0}
          onClick={(e) => {
            e.stopPropagation();
            onOpenQty(product.id);
          }}
        >
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
