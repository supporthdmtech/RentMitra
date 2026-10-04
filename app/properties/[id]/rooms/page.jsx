"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  createRoom,
  deleteRoom,
  getProperty,
  getRoomsForProperty,
  getTenantsByProperty,
} from "@/lib/queries";
import { roomBreakdown } from "@/lib/rooms";
import GradientHeader from "@/components/GradientHeader";
import BottomTabBar from "@/components/BottomTabBar";

export default function ManageRoomsPage() {
  const { id: propertyId } = useParams();
  const router = useRouter();
  const [property, setProperty] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [roomNo, setRoomNo] = useState("");
  const [billingMode, setBillingMode] = useState("room");
  const [bedCount, setBedCount] = useState("2");
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    load();
  }, [propertyId]);

  async function load() {
    const [propertyData, roomData, tenantData] = await Promise.all([
      getProperty(propertyId),
      getRoomsForProperty(propertyId),
      getTenantsByProperty(propertyId),
    ]);
    setProperty(propertyData);
    setRooms(roomData);
    setTenants(tenantData);
    // Hostels are more often bed-wise/dorm-style, PGs more often
    // private-room — just a sensible starting point, editable per room.
    setBillingMode(propertyData.type === "hostel" ? "bed" : "room");
    setLoading(false);
  }

  if (loading) return <p className="p-6 text-sm text-gray-500">Loading…</p>;

  const breakdown = roomBreakdown(property, { rooms, tenants });

  async function handleAddRoom() {
    setError("");
    if (!roomNo.trim()) {
      setError("Enter a room number.");
      return;
    }
    try {
      await createRoom({
        propertyId,
        roomNo: roomNo.trim(),
        billingMode,
        bedCount: billingMode === "bed" ? Number(bedCount) : 0,
      });
      setRoomNo("");
      setBedCount("2");
      setAdding(false);
      await load();
    } catch (e) {
      setError(e.message?.includes("duplicate") ? "That room number already exists." : e.message);
    }
  }

  async function handleDeleteRoom(roomId) {
    setDeleteError("");
    try {
      await deleteRoom(roomId);
      await load();
    } catch (e) {
      setDeleteError(
        e.message?.includes("violates foreign key")
          ? "Can't delete — this room still has tenant history."
          : e.message
      );
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-white pb-24">
      <GradientHeader
        title="Manage Rooms"
        subtitle={property.name}
        gradient="orange"
        backHref={`/properties/${propertyId}`}
      />

      <div className="p-6">
        {breakdown.length === 0 ? (
          <p className="mb-5 text-sm text-gray-500">
            No rooms yet — add your first one below before adding tenants.
          </p>
        ) : (
          <div className="mb-5 flex flex-col gap-3">
            {breakdown.map(({ room, beds, tenant }) => (
              <div key={room.id} className="rounded-xl border border-gray-100 p-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-bold">Room {room.room_no}</div>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-bold text-gray-500">
                      {room.billing_mode === "bed" ? "BED-WISE" : "ROOM-WISE"}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteRoom(room.id)}
                    className="text-[11px] font-semibold text-red-500"
                  >
                    Delete
                  </button>
                </div>
                {room.billing_mode === "bed" ? (
                  <div className="flex flex-wrap gap-2">
                    {beds.map(({ bed, tenant: bedTenant }) => (
                      <span
                        key={bed.id}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                          bedTenant ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
                        }`}
                      >
                        Bed {bed.label} — {bedTenant ? bedTenant.name : "Vacant"}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span
                    className={`inline-block rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                      tenant ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
                    }`}
                  >
                    {tenant ? tenant.name : "Vacant"}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {deleteError ? <p className="mb-4 text-sm text-red-600">{deleteError}</p> : null}

        {adding ? (
          <div className="rounded-xl border border-gray-100 p-4">
            <label className="mb-2 block text-xs font-semibold">Room Number *</label>
            <input
              value={roomNo}
              onChange={(e) => setRoomNo(e.target.value)}
              placeholder="e.g., 101"
              className="mb-4 w-full rounded-lg border-[1.5px] border-gray-200 px-3.5 py-3 text-sm"
            />

            <label className="mb-2 block text-xs font-semibold">How is this room billed? *</label>
            <div className="mb-4 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setBillingMode("bed")}
                className={`rounded-lg border-2 p-3 text-xs font-bold ${
                  billingMode === "bed" ? "border-blue-600 bg-blue-50 text-blue-600" : "border-gray-200 text-gray-500"
                }`}
              >
                🛏️ Bed-wise
              </button>
              <button
                onClick={() => setBillingMode("room")}
                className={`rounded-lg border-2 p-3 text-xs font-bold ${
                  billingMode === "room" ? "border-blue-600 bg-blue-50 text-blue-600" : "border-gray-200 text-gray-500"
                }`}
              >
                🚪 Room-wise
              </button>
            </div>

            {billingMode === "bed" ? (
              <>
                <label className="mb-2 block text-xs font-semibold">Number of Beds *</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={bedCount}
                  onChange={(e) => setBedCount(e.target.value)}
                  className="mb-4 w-full rounded-lg border-[1.5px] border-gray-200 px-3.5 py-3 text-sm"
                />
              </>
            ) : null}
            {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
            <div className="flex gap-2">
              <button
                onClick={handleAddRoom}
                className="flex-1 rounded-lg bg-orange-500 py-3 text-sm font-bold text-white"
              >
                Save Room
              </button>
              <button
                onClick={() => setAdding(false)}
                className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-bold text-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="font-heading w-full rounded-xl border-[1.5px] border-orange-200 py-3.5 text-sm font-bold text-orange-600"
          >
            + Add Room
          </button>
        )}

        {breakdown.length > 0 ? (
          <Link
            href={`/properties/${propertyId}/tenants/new`}
            className="font-heading mt-3 block w-full rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 py-3.5 text-center text-sm font-bold text-white"
          >
            + Add Tenant
          </Link>
        ) : null}
      </div>
      <BottomTabBar />
    </div>
  );
}
