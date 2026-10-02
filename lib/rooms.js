// PG and Hostel both choose bed-wise or room-wise billing; Rental has no
// rooms/beds concept at all (unaffected).
export function effectiveBillingMode(property) {
  if (property.type === "pg" || property.type === "hostel") return property.billing_mode;
  return null;
}

// `rooms` here is the shape getRoomsForProperty() returns: each room comes
// with its `beds` array already embedded (one Supabase query, no separate
// join needed). Pure functions — no supabase dependency.

export function occupancyFor(property, { rooms = [], tenants = [] } = {}) {
  const mode = effectiveBillingMode(property);
  const propertyTenants = tenants.filter((t) => t.property_id === property.id);

  if (!mode) {
    return { mode: "rental", total: property.total_units, occupied: propertyTenants.length };
  }

  const propertyRooms = rooms.filter((r) => r.property_id === property.id);

  if (mode === "bed") {
    const totalBeds = propertyRooms.reduce((sum, r) => sum + (r.beds?.length || 0), 0);
    const occupiedBedIds = new Set(propertyTenants.filter((t) => t.bed_id).map((t) => t.bed_id));
    return { mode: "bed", total: totalBeds, occupied: occupiedBedIds.size };
  }

  // room-wise
  const occupiedRoomIds = new Set(propertyTenants.filter((t) => t.room_id).map((t) => t.room_id));
  return { mode: "room", total: propertyRooms.length, occupied: occupiedRoomIds.size };
}

// Per-room breakdown for the Property Detail screen.
export function roomBreakdown(property, { rooms = [], tenants = [] } = {}) {
  const mode = effectiveBillingMode(property);
  if (!mode) return [];

  const propertyRooms = rooms.filter((r) => r.property_id === property.id);
  const propertyTenants = tenants.filter((t) => t.property_id === property.id);

  return propertyRooms.map((room) => {
    if (mode === "bed") {
      return {
        room,
        beds: (room.beds || []).map((bed) => ({
          bed,
          tenant: propertyTenants.find((t) => t.bed_id === bed.id) || null,
        })),
      };
    }
    return {
      room,
      tenant: propertyTenants.find((t) => t.room_id === room.id) || null,
    };
  });
}
