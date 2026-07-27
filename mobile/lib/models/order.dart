import 'package:flutter/foundation.dart';

/// Order status vocabulary used by `/api/orders`. The backend accepts
/// lowercase values via PATCH; the web app additionally shows legacy
/// SO/DO/Invoiced/Delivered labels for older records.
enum OrderStatus {
  pending,
  processing,
  invoiced,
  delivered,
  completed,
  cancelled,
  paid,
  other;

  static OrderStatus fromString(String? raw) {
    switch (raw?.toLowerCase()) {
      case 'pending':
        return OrderStatus.pending;
      case 'processing':
        return OrderStatus.processing;
      case 'invoiced':
        return OrderStatus.invoiced;
      case 'delivered':
        return OrderStatus.delivered;
      case 'completed':
        return OrderStatus.completed;
      case 'cancelled':
        return OrderStatus.cancelled;
      case 'paid':
        return OrderStatus.paid;
      default:
        return OrderStatus.other;
    }
  }

  String get label {
    switch (this) {
      case OrderStatus.pending:
        return 'Pending';
      case OrderStatus.processing:
        return 'DO Created';
      case OrderStatus.invoiced:
        return 'Invoiced';
      case OrderStatus.delivered:
        return 'Delivered';
      case OrderStatus.completed:
        return 'Completed';
      case OrderStatus.cancelled:
        return 'Cancelled';
      case OrderStatus.paid:
        return 'Paid';
      case OrderStatus.other:
        return 'Open';
    }
  }
}

/// One line item on a sales order, matching the backend Order shape.
@immutable
class OrderLineItem {
  final String name;
  final num quantity;
  final num unitPrice;
  final num itemTotal;

  const OrderLineItem({
    required this.name,
    required this.quantity,
    required this.unitPrice,
    required this.itemTotal,
  });

  num get computedTotal => quantity * unitPrice;

  factory OrderLineItem.fromJson(Map<String, dynamic> json) {
    return OrderLineItem(
      name: (json['name'] ?? '').toString(),
      quantity: (json['quantity'] ?? json['qty'] ?? 0) as num,
      unitPrice: (json['unitPrice'] ?? json['price'] ?? 0) as num,
      itemTotal: (json['itemTotal'] ?? json['totalPrice'] ?? 0) as num,
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'quantity': quantity,
        'unitPrice': unitPrice,
      };
}

/// A sales order, mirroring `/api/orders` response shape.
@immutable
class SalesOrder {
  final String id;
  final String clientName;
  final List<OrderLineItem> items;
  final int totalItems;
  final num totalAmount;
  final OrderStatus status;
  final String createdAt;
  final String? deliveryAddress;
  final String? contactNumber;
  final String? notes;
  /// Proof-of-delivery signature captured on delivery (data URL). Round-tripped
  /// via the backend's `signature` field on `PATCH /api/orders/:id`.
  final String? signature;

  const SalesOrder({
    required this.id,
    required this.clientName,
    required this.items,
    required this.totalItems,
    required this.totalAmount,
    required this.status,
    required this.createdAt,
    this.deliveryAddress,
    this.contactNumber,
    this.notes,
    this.signature,
  });

  factory SalesOrder.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List<dynamic>? ?? const [];
    return SalesOrder(
      id: (json['id'] ?? '').toString(),
      clientName: (json['clientName'] ?? json['client_name'] ?? '').toString(),
      items: rawItems
          .map((e) => OrderLineItem.fromJson(e as Map<String, dynamic>))
          .toList(growable: false),
      totalItems: (json['totalItems'] ?? 0) as int,
      totalAmount: (json['totalAmount'] ?? json['total'] ?? 0) as num,
      status: OrderStatus.fromString(json['status']?.toString()),
      createdAt: (json['createdAt'] ?? json['date'] ?? '').toString(),
      deliveryAddress: json['deliveryAddress'] as String?,
      contactNumber: json['contactNumber'] as String?,
      notes: json['notes'] as String?,
      signature: json['signature'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'clientName': clientName,
        'items': items.map((e) => e.toJson()).toList(),
        if (deliveryAddress != null) 'deliveryAddress': deliveryAddress,
        if (contactNumber != null) 'contactNumber': contactNumber,
        if (notes != null) 'notes': notes,
      };
}
