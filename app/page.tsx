"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ChordMidpoint = () => {
  const [sides, setSides] = useState(3);
  const [chordLength, setChordLength] = useState(30);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [stepPoints, setStepPoints] = useState([] as { x: number; y: number; }[]);
  const [activeForward, setActiveForward] = useState(false);
  const totalSteps = 1000;
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

  // Generate step points
  useEffect(() => {
    const polygonPoints = generatePolygon(sides);
    const points = [];
    for (let i = 0; i < totalSteps; i++) {
      points.push(getPointOnPolygon(polygonPoints, i / totalSteps));
    }
    setStepPoints(points);
  }, [sides, generatePolygon, getPointOnPolygon]);

  // Get current points
  const getIndexPoints = useCallback((index: number) => {
    const polygonPoints = generatePolygon(sides);
    const actualLength = (chordLength / 100) * 160;

    const point1 = stepPoints[index] || defaultPoint;
    const intersections = polygonPoints.flatMap((p, i) => {
      const nextP = polygonPoints[(i + 1) % polygonPoints.length];
      return circleLineIntersection(point1, actualLength, p, nextP);
    });

    // sort intersections in clockwise direction from green to grey
    intersections.sort((a, b) => {
      // Calculate angles relative to the green dot (point1)
      const angleA = Math.atan2(a.y - point1.y, a.x - point1.x);
      const angleB = Math.atan2(b.y - point1.y, b.x - point1.x);

      // swap if activeForward is true
      if (activeForward) {
        return (angleA - angleB + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
      }
      // Ensure clockwise order: subtract angles and handle wrapping around 2*PI
      return (angleB - angleA + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    });

    return {
      point1,
      intersections
    };
  }, [sides, chordLength, currentPointIndex, stepPoints, generatePolygon, circleLineIntersection]);

  const { point1, intersections } = getIndexPoints(currentPointIndex);
  const { point1: nextPoint1, intersections: nextIntersections } = getIndexPoints((currentPointIndex + 1) % totalSteps);
  const polygonPoints = generatePolygon(sides);

  // Find the next intersection point in the clockwise direction from opposite point
  const point2 = intersections[0] || defaultPoint;
  const nextPoint2 = nextIntersections[0] || defaultPoint;

  const checkValidAndSetCurrentPointIndex = (value: number) => {
    if (Math.abs(nextPoint2.x - point2.x) > 10 || Math.abs(nextPoint2.y - point2.y) > 10) {
      console.log("Switching to ", !activeForward ? "forward" : "backward");
      console.log("Next Intersection: ", point2, "Next Probable Intersection: ", nextPoint2);

      // switch activeForward and try
      // find closest index to nextIntersection
      const closestIndex = stepPoints.reduce((acc, curr, index) => {
        const distance = Math.sqrt((curr.x - point2.x) ** 2 + (curr.y - point2.y) ** 2);
        if (distance < acc.distance) {
          return { index, distance };
        }
        return acc;
      }, { index: 0, distance: Infinity });
      setCurrentPointIndex(closestIndex.index);
      setActiveForward(!activeForward);
      return
    }

    setCurrentPointIndex(value);
  }

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

            {/* Center */}
            <circle cx={center.x} cy={center.y} r="3" fill="black" />

            {/* Line to next intersection */}
            <line
              x1={point1.x}
              y1={point1.y}
              x2={point2.x}
              y2={point2.y}
              stroke="green"
              strokeWidth="2"
            />

            {/* Next probable intersection */}
            <circle cx={nextPoint2.x} cy={nextPoint2.y} r="4" fill="orange" />

            {/* Current point */}
            <circle cx={point1.x} cy={point1.y} r="3" fill="red" />

            {/* Next intersection */}
            <circle cx={point2.x} cy={point2.y} r="3" fill="blue" />
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
              <label className="block text-sm font-medium mb-2">Step: {currentPointIndex} / 1000</label>
              <Slider
                value={[currentPointIndex]}
                min={0}
                max={totalSteps - 1}
                step={1}
                onValueChange={(value) => checkValidAndSetCurrentPointIndex(value[0])}
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
