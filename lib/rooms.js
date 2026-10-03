// Billing mode is per-ROOM, not per-property — a single PG or Hostel can
// mix bed-wise (shared/dorm) rooms with room-wise (private) rooms. Rental
// has no rooms/beds concept at all (unaffected).
export function isRoomBased(property) {
  return property.type === "pg" || property.type === "hostel";
}

export function roomBillingMode(room) {
  return room.billing_mode; // "bed" | "room"
}

// Occupancy counts every bed (in a bed-wise room) and every whole room (in
// a room-wise room) as one "slot" — the only unit that still makes sense
// to sum once a property's rooms don't all share one billing mode.
// `mode` on the result is "bed"/"room" only when every room agrees;
// "mixed" when the property has both kinds; null for rental.
export function occupancyFor(property, { rooms = [], tenants = [] } = {}) {
  const propertyTenants = tenants.filter((t) => t.property_id === property.id);

  if (!isRoomBased(property)) {
    return { mode: null, total: property.total_units, occupied: propertyTenants.length };
  }

  const propertyRooms = rooms.filter((r) => r.property_id === property.id);
  let total = 0;
  let occupied = 0;

  for (const room of propertyRooms) {
    if (roomBillingMode(room) === "bed") {
      const beds = room.beds || [];
      total += beds.length;
      occupied += propertyTenants.filter((t) => beds.some((b) => b.id === t.bed_id)).length;
    } else {
      total += 1;
      if (propertyTenants.some((t) => t.room_id === room.id)) occupied += 1;
    }
  }

  const modes = new Set(propertyRooms.map(roomBillingMode));
  const mode = modes.size === 0 ? null : modes.size > 1 ? "mixed" : [...modes][0];

  return { mode, total, occupied };
}

// Per-room breakdown for the Property Detail / Manage Rooms screens.
export function roomBreakdown(property, { rooms = [], tenants = [] } = {}) {
  if (!isRoomBased(property)) return [];

  const propertyRooms = rooms.filter((r) => r.property_id === property.id);
  const propertyTenants = tenants.filter((t) => t.property_id === property.id);

  return propertyRooms.map((room) => {
    if (roomBillingMode(room) === "bed") {
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
