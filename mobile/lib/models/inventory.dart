import 'package:flutter/foundation.dart';

/// Mirror of the web app's `InventoryItem` (`types.ts`) and the backend
/// `/api/inventory/list` shape. Derived fields (profit, stockValue,
/// lowStockFlag) are recomputed here so the UI is self-sufficient even when
/// the backend omits them.
@immutable
class InventoryItem {
  final String id;
  final String name;
  final String sku;
  final String category;
  final String brand;
  final num quantity;
  final num minLevel;
  final num unitCost;
  final num sellingPrice;
  final String supplier;
  final String lastMovement;
  final String? imageUrl;

  const InventoryItem({
    required this.id,
    required this.name,
    required this.sku,
    required this.category,
    required this.brand,
    required this.quantity,
    required this.minLevel,
    required this.unitCost,
    required this.sellingPrice,
    required this.supplier,
    required this.lastMovement,
    this.imageUrl,
  });

  /// True when stock has dropped at or below the reorder level.
  bool get isLowStock => quantity <= minLevel;

  /// Profit per unit (selling price minus cost).
  num get profit => sellingPrice - unitCost;

  /// Cost-based stock valuation (quantity on hand * unit cost).
  num get stockValue => quantity * unitCost;

  /// Gross margin percentage (0-100). Zero when price is unset.
  num get marginPercent =>
      sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;

  factory InventoryItem.fromJson(Map<String, dynamic> json) {
    return InventoryItem(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      sku: (json['sku'] ?? '').toString(),
      category: (json['category'] ?? '').toString(),
      brand: (json['brand'] ?? '').toString(),
      quantity: json['quantity'] ?? 0,
      minLevel: json['minLevel'] ?? json['reorderLevel'] ?? 0,
      unitCost: json['unitCost'] ?? json['unit_cost'] ?? 0,
      sellingPrice: json['sellingPrice'] ?? json['selling_price'] ?? 0,
      supplier: (json['supplier'] ?? '').toString(),
      lastMovement: (json['lastMovement'] ?? json['last_movement'] ?? '').toString(),
      imageUrl: (json['image_url'] ?? json['imageUrl']) as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'sku': sku,
        'category': category,
        'brand': brand,
        'quantity': quantity,
        'minLevel': minLevel,
        'unitCost': unitCost,
        'sellingPrice': sellingPrice,
        'supplier': supplier,
      };
}

/// Aggregate metrics from `GET /api/inventory/summary`.
@immutable
class InventorySummary {
  final int totalItems;
  final num totalStockValue;
  final int lowStockCount;
  final num totalQuantity;

  const InventorySummary({
    required this.totalItems,
    required this.totalStockValue,
    required this.lowStockCount,
    required this.totalQuantity,
  });

  factory InventorySummary.fromJson(Map<String, dynamic> json) {
    return InventorySummary(
      totalItems: (json['totalItems'] ?? json['total_items'] ?? 0) as int,
      totalStockValue:
          (json['totalStockValue'] ?? json['total_stock_value'] ?? 0) as num,
      lowStockCount:
          (json['lowStockCount'] ?? json['low_stock_count'] ?? 0) as int,
      totalQuantity:
          (json['totalQuantity'] ?? json['total_quantity'] ?? 0) as num,
    );
  }

  static const empty = InventorySummary(
    totalItems: 0,
    totalStockValue: 0,
    lowStockCount: 0,
    totalQuantity: 0,
  );
}

/// A single stock movement entry (`GET /api/inventory/stock-history/:itemId`).
@immutable
class StockMovement {
  final String id;
  final String movementType;
  final num quantity;
  final String? referenceNumber;
  final String date;
  final String? remarks;

  const StockMovement({
    required this.id,
    required this.movementType,
    required this.quantity,
    this.referenceNumber,
    required this.date,
    this.remarks,
  });

  factory StockMovement.fromJson(Map<String, dynamic> json) {
    return StockMovement(
      id: (json['id'] ?? '').toString(),
      movementType: (json['movementType'] ?? json['movement_type'] ?? '').toString(),
      quantity: (json['quantity'] ?? 0) as num,
      referenceNumber: json['referenceNumber'] as String?,
      date: (json['date'] ?? json['createdAt'] ?? '').toString(),
      remarks: json['remarks'] as String?,
    );
  }
}

/// Goods Received Note (`POST /api/inventory/grn`).
@immutable
class Grn {
  final String id;
  final String grnNumber;
  final String date;
  final String supplier;
  final String warehouse;
  final String itemName;
  final num quantityReceived;
  final num? unitCost;

  const Grn({
    required this.id,
    required this.grnNumber,
    required this.date,
    required this.supplier,
    required this.warehouse,
    required this.itemName,
    required this.quantityReceived,
    this.unitCost,
  });

  factory Grn.fromJson(Map<String, dynamic> json) {
    return Grn(
      id: (json['id'] ?? '').toString(),
      grnNumber: (json['grnNumber'] ?? '').toString(),
      date: (json['date'] ?? '').toString(),
      supplier: (json['supplier'] ?? '').toString(),
      warehouse: (json['warehouse'] ?? '').toString(),
      itemName: (json['itemName'] ?? '').toString(),
      quantityReceived: (json['quantityReceived'] ?? 0) as num,
      unitCost: json['unitCost'] as num?,
    );
  }
}
