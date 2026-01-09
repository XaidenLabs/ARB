/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useMemo } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { scaleLinear } from "d3-scale";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface MapProps {
    data: Array<{
        name: string;
        coordinates: [number, number]; // [lon, lat]
        count: number;
    }>;
}

export default function DeviceMap({ data }: MapProps) {
    const sizeScale = useMemo(() => {
        const max = Math.max(...data.map(d => d.count), 0);
        return scaleLinear().domain([0, max]).range([4, 10]);
    }, [data]);

    return (
        <div className="w-full h-[300px] bg-[#1A1D27] rounded-2xl overflow-hidden relative">
            <h3 className="absolute top-4 left-4 text-white text-sm font-medium z-10 bg-black/50 px-3 py-1 rounded-full backdrop-blur-md">
                Active Regions
            </h3>

            <div className="flex items-center gap-2 absolute bottom-4 left-4 z-10">
                <button className="h-6 w-6 rounded flex items-center justify-center bg-white/10 text-white hover:bg-white/20 text-xs font-bold">+</button>
                <button className="h-6 w-6 rounded flex items-center justify-center bg-white/10 text-white hover:bg-white/20 text-xs font-bold">-</button>
            </div>

            <ComposableMap
                projection="geoMercator"
                projectionConfig={{
                    scale: 100,
                    center: [0, 20]
                }}
                style={{
                    width: "100%",
                    height: "100%",
                    background: "#1A1D27"
                }}
            >
                <Geographies geography={geoUrl}>
                    {({ geographies }: { geographies: any[] }) =>
                        geographies.map((geo) => (
                            <Geography
                                key={geo.rsmKey}
                                geography={geo}
                                fill="#2A2D3A" // Dark grey for land
                                stroke="#1A1D27" // Background color for borders
                                strokeWidth={0.5}
                                style={{
                                    default: { outline: "none" },
                                    hover: { fill: "#353849", outline: "none" },
                                    pressed: { outline: "none" },
                                }}
                            />
                        ))
                    }
                </Geographies>

                {data.map(({ name, coordinates, count }) => (
                    <Marker key={name} coordinates={coordinates}>
                        {/* Glow effect */}
                        <circle r={Number(sizeScale(count)) + 4} fill="#8b5cf6" opacity={0.2} className="animate-pulse" />
                        {/* Core dot */}
                        <circle r={Number(sizeScale(count))} fill="#8b5cf6" stroke="#fff" strokeWidth={1} />

                        <text
                            textAnchor="middle"
                            y={-10}
                            style={{ fontFamily: "system-ui", fill: "#fff", fontSize: "8px", fontWeight: "bold", textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
                        >
                            {name}
                        </text>
                    </Marker>
                ))}
            </ComposableMap>
        </div>
    );
}
