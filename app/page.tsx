"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ChordMidpoint = () => {
  const [sides, setSides] = useState(4);
  const [chordLength, setChordLength] = useState(50);
  const [position, setPosition] = useState(0);
  const center = { x: 0, y: 0 };
  const defaultPoint = center;

  // Generate regular polygon points
  const generatePolygon = useCallback((sides: number) => {
    const points = [];
    const radius = 80;
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides;
      points.push({
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle)
      });
    }
    return points;
  }, []);

  // Calculate intersection points between circle and line segment
  const circleLineIntersection = useCallback((center: { x: number; y: number; }, radius: number, p1: { x: number; y: number; }, p2: { x: number; y: number; }) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const a = dx * dx + dy * dy;
    const b = 2 * (dx * (p1.x - center.x) + dy * (p1.y - center.y));
    const c = center.x * center.x + center.y * center.y + p1.x * p1.x + p1.y * p1.y -
      2 * (center.x * p1.x + center.y * p1.y) - radius * radius;

    const det = b * b - 4 * a * c;
    if (det < 0) return [];

    const t1 = (-b + Math.sqrt(det)) / (2 * a);
    const t2 = (-b - Math.sqrt(det)) / (2 * a);

    const points = [];
    if (t1 >= 0 && t1 <= 1) {
      points.push({
        x: p1.x + t1 * dx,
        y: p1.y + t1 * dy
      });
    }
    if (t2 >= 0 && t2 <= 1) {
      points.push({
        x: p1.x + t2 * dx,
        y: p1.y + t2 * dy
      });
    }
    return points;
  }, []);

  // Get point on polygon perimeter
  const getPointOnPolygon = useCallback((polygonPoints: string | any[], t: number) => {
    const totalSegments = polygonPoints.length;
    const segment = Math.floor(t * totalSegments);
    const nextSegment = (segment + 1) % totalSegments;
    const segmentT = (t * totalSegments) % 1;

    const p1 = polygonPoints[segment] || defaultPoint;
    const p2 = polygonPoints[nextSegment];

    return {
      x: p1.x + (p2.x - p1.x) * segmentT,
      y: p1.y + (p2.y - p1.y) * segmentT
    };
  }, []);

  // Get current points
  const getCurrentPoints = useCallback(() => {
    const polygonPoints = generatePolygon(sides);
    const actualLength = (chordLength / 100) * 160;

    const point1 = getPointOnPolygon(polygonPoints, position);
    const intersections = polygonPoints.flatMap((p, i) => {
      const nextP = polygonPoints[(i + 1) % polygonPoints.length];
      return circleLineIntersection(point1, actualLength, p, nextP);
    });

    const oppositePoint = {
      x: center.x + Math.cos(Math.atan2(point1.y - center.y, point1.x - center.x)) * 100,
      y: center.y + Math.sin(Math.atan2(point1.y - center.y, point1.x - center.x)) * 100
    };

    // sort intersections in clockwise direction from green to grey
    intersections.sort((a, b) => {
      // Calculate angles relative to the green dot (point1)
      const angleA = Math.atan2(a.y - point1.y, a.x - point1.x);
      const angleB = Math.atan2(b.y - point1.y, b.x - point1.x);

      // Ensure clockwise order: subtract angles and handle wrapping around 2*PI
      return (angleB - angleA + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    });

    return {
      point1,
      intersections
    };
  }, [sides, position, chordLength, generatePolygon, getPointOnPolygon, circleLineIntersection]);

  const { point1, intersections } = getCurrentPoints();
  const polygonPoints = generatePolygon(sides);

  // end of diameter from current point as center on red circle
  const oppositePoint = {
    x: center.x + Math.cos(Math.atan2(point1.y - center.y, point1.x - center.x)) * 100,
    y: center.y + Math.sin(Math.atan2(point1.y - center.y, point1.x - center.x)) * 100
  };

  // Find the next intersection point in the clockwise direction from opposite point
  // const nextIntersection = intersections.find(p => {
  //   const angleOpposite = Math.atan2(oppositePoint.y - point1.y, oppositePoint.x - point1.x);
  //   const angleP = Math.atan2(p.y - point1.y, p.x - point1.x);
  //   console.log(p.x, p.y, angleP, angleOpposite);
  //   return angleP > angleOpposite;
  // });
  const nextIntersection = intersections[0];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Chord Midpoint Path</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <svg viewBox="-100 -100 200 200" className="w-full h-96 bg-slate-50">
            {/* Base polygon */}
            <path
              d={`M ${polygonPoints.map(p => `${p.x},${p.y}`).join(' L ')} Z`}
              fill="none"
              stroke="black"
              strokeWidth="1"
            />

            {/* Current chord */}
            {/* <circle
              cx={point1.x}
              cy={point1.y}
              r={(chordLength / 100) * 160}
              stroke="red"
              strokeWidth="2"
              fill="none"
            /> */}

            {/* Intersection points */}
            {/* {intersections.map((point, index) => (
              <circle key={index} cx={point.x} cy={point.y} r="3" fill="blue" />
            ))} */}

            {/* Center */}
            <circle cx={center.x} cy={center.y} r="3" fill="black" />

            {/* Opposite point */}
            {/* <circle cx={oppositePoint.x} cy={oppositePoint.y} r="3" fill="grey" /> */}

            {/* Line to next intersection */}
            {nextIntersection && (
              <line
                x1={point1.x}
                y1={point1.y}
                x2={nextIntersection.x}
                y2={nextIntersection.y}
                stroke="green"
                strokeWidth="2"
              />
            )}

            {/* Current point */}
            <circle cx={point1.x} cy={point1.y} r="3" fill="blue" />

            {/* Next intersection */}
            {nextIntersection && (
              <circle cx={nextIntersection.x} cy={nextIntersection.y} r="3" fill="blue" />
            )}
          </svg>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Number of Sides: {sides}</label>
              <Slider
                value={[sides]}
                min={3}
                max={10}
                step={1}
                onValueChange={(value) => setSides(value[0])}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Position: {Math.round(position * 100)}%</label>
              <Slider
                value={[position]}
                min={0}
                max={0.999}
                step={0.001}
                onValueChange={(value) => setPosition(value[0])}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Chord Length: {chordLength}%</label>
              <Slider
                value={[chordLength]}
                min={10}
                max={100}
                step={1}
                onValueChange={(value) => setChordLength(value[0])}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChordMidpoint;