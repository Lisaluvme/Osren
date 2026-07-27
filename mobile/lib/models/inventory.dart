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

/// Inter-warehouse stock transfer (`GET /api/inventory/transfer-history`).
@immutable
class StockTransfer {
  final String id;
  final String transferNumber;
  final String date;
  final String fromWarehouse;
  final String toWarehouse;
  final String itemName;
  final num quantity;
  final String status;

  const StockTransfer({
    required this.id,
    required this.transferNumber,
    required this.date,
    required this.fromWarehouse,
    required this.toWarehouse,
    required this.itemName,
    required this.quantity,
    required this.status,
  });

  factory StockTransfer.fromJson(Map<String, dynamic> json) {
    return StockTransfer(
      id: (json['id'] ?? '').toString(),
      transferNumber: (json['transferNumber'] ?? '').toString(),
      date: (json['date'] ?? json['createdAt'] ?? '').toString(),
      fromWarehouse: (json['fromWarehouse'] ?? '').toString(),
      toWarehouse: (json['toWarehouse'] ?? '').toString(),
      itemName: (json['itemName'] ?? '').toString(),
      quantity: (json['quantity'] ?? 0) as num,
      status: (json['status'] ?? 'PENDING').toString().toUpperCase(),
    );
  }
}

/// Stock-take / count variance record (`GET /api/inventory/stock-take-history`).
@immutable
class StockTake {
  final String id;
  final String stockTakeNumber;
  final String date;
  final String warehouse;
  final String itemName;
  final num systemQuantity;
  final num actualQuantity;
  final num variance;
  final String status;

  const StockTake({
    required this.id,
    required this.stockTakeNumber,
    required this.date,
    required this.warehouse,
    required this.itemName,
    required this.systemQuantity,
    required this.actualQuantity,
    required this.variance,
    required this.status,
  });

  factory StockTake.fromJson(Map<String, dynamic> json) {
    return StockTake(
      id: (json['id'] ?? '').toString(),
      stockTakeNumber: (json['stockTakeNumber'] ?? '').toString(),
      date: (json['date'] ?? json['createdAt'] ?? '').toString(),
      warehouse: (json['warehouse'] ?? '').toString(),
      itemName: (json['itemName'] ?? '').toString(),
      systemQuantity: (json['systemQuantity'] ?? 0) as num,
      actualQuantity: (json['actualQuantity'] ?? 0) as num,
      variance: (json['variance'] ?? 0) as num,
      status: (json['status'] ?? 'DRAFT').toString().toUpperCase(),
    );
  }
}
