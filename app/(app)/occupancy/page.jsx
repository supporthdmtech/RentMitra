"use client";

import { useEffect, useState } from "react";
import { getActiveProperties, getAllActiveTenants } from "@/lib/queries";
import GradientHeader from "@/components/GradientHeader";

export default function OccupancyPage() {
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getActiveProperties(), getAllActiveTenants()]).then(([p, t]) => {
      setProperties(p);
      setTenants(t);
      setLoading(false);
    });
  }, []);

  const rows = properties.map((property) => {
    const occupied = tenants.filter((t) => t.property_id === property.id).length;
    const total = property.total_units;
    return {
      ...property,
      occupied,
      total,
      pct: total ? Math.round((occupied / total) * 100) : 0,
      vacant: Math.max(0, total - occupied),
    };
  });

  const totalUnits = rows.reduce((s, r) => s + r.total, 0);
  const totalOccupied = rows.reduce((s, r) => s + r.occupied, 0);
  const overallPct = totalUnits ? Math.round((totalOccupied / totalUnits) * 100) : 0;
  const vacantRows = rows.filter((r) => r.vacant > 0);

  return (
    <div>
      <GradientHeader title="Occupancy" subtitle="All properties" gradient="green" backHref="/dashboard" />

      <div className="p-6">
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <>
            <div className="mb-6 rounded-xl border border-green-100 bg-gradient-to-br from-green-50 to-sky-50 p-4 text-center">
              <div className="mb-2 text-xs font-semibold text-emerald-600">OVERALL OCCUPANCY</div>
              <div className="font-heading text-4xl font-extrabold text-emerald-600">{overallPct}%</div>
              <div className="mt-2 text-[11px] text-gray-500">
                {totalOccupied} of {totalUnits} total units occupied
              </div>
            </div>

            <div className="mb-4">
              <div className="font-heading mb-3 text-sm font-bold">Properties</div>
              <div className="flex flex-col gap-2.5">
                {rows.map((r) => (
                  <div key={r.id} className="rounded-lg bg-sky-50 p-3.5">
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <div className="text-sm font-bold">{r.name}</div>
                        <div className="text-[11px] text-gray-500">{r.type === "pg" ? "PG / Hostel" : "Rental"}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-heading text-sm font-bold text-blue-600">{r.pct}%</div>
                        <div className="text-[10px] text-gray-500">
                          {r.occupied}/{r.total} {r.type === "pg" ? "rooms" : "units"}
                        </div>
                      </div>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-blue-100">
                      <div className="h-full bg-blue-600" style={{ width: `${r.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-gray-100 p-3 text-center">
              <div className="mb-1 text-[11px] text-gray-500">Vacant Rooms</div>
              <div className="font-heading text-lg font-bold text-gray-400">
                {vacantRows.reduce((s, r) => s + r.vacant, 0)}
              </div>
              {vacantRows[0] ? (
                <div className="mt-1 text-[10px] text-gray-500">{vacantRows[0].name} • Ready to list</div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
