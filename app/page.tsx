"use client";
import React, { useState, useEffect, use } from 'react';
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ChordMidpoint = () => {
  const [sides, setSides] = useState(3);
  const [chordLength, setChordLength] = useState(30);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [stepPoints, setStepPoints] = useState([] as { x: number; y: number; }[]);
  const [play, setPlay] = useState(false);
  const [showActiveNeighbors, setShowActiveNeighbors] = useState(false);
  const [showNextPredictedPoint, setShowNextPredictedPoint] = useState(false);
  const [activeForward, setActiveForward] = useState(false);
  const [point2, setPoint2] = useState<{ x: number; y: number; }>({ x: 0, y: 0 });
  const [nextPoint2, setNextPoint2] = useState<{ x: number; y: number; }>({ x: 0, y: 0 });
  const totalSteps = 1000;
  const center = { x: 0, y: 0 };
  const defaultPoint = center;

  const generatePolygon = (sides: number) => {
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
  };

  const circleLineIntersection = (center: { x: number; y: number; }, radius: number, p1: { x: number; y: number; }, p2: { x: number; y: number; }) => {
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
  };

  const getPointOnPolygon = (polygonPoints: { x: number; y: number; }[], t: number) => {
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
  };

  useEffect(() => {
    const polygonPoints = generatePolygon(sides);
    const points = [];
    for (let i = 0; i < totalSteps + 200; i++) {
      points.push(getPointOnPolygon(polygonPoints, i / totalSteps));
    }
    setStepPoints(points);
  }, [sides]);

  const getIndexPoints = (index: number) => {
    const polygonPoints = generatePolygon(sides);
    const actualLength = (chordLength / 100) * 160;

    const point1 = stepPoints[index] || defaultPoint;
    const intersections = polygonPoints.flatMap((p, i) => {
      const nextP = polygonPoints[(i + 1) % polygonPoints.length];
      return circleLineIntersection(point1, actualLength, p, nextP);
    });

    intersections.sort((a, b) => {
      const angleA = Math.atan2(a.y - point1.y, a.x - point1.x);
      const angleB = Math.atan2(b.y - point1.y, b.x - point1.x);

      if (activeForward) {
        return (angleA - angleB + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
      }
      return (angleB - angleA + 2 * Math.PI + 0.1) % (2 * Math.PI) - Math.PI;
    });

    return {
      point1,
      intersections
    };
  };

  useEffect(() => {
    const { point1, intersections } = getIndexPoints(currentPointIndex);
    const polygonPoints = generatePolygon(sides);

    if (intersections.length > 0) {
      const closestIntersection = intersections.reduce((closest, current) => {
        const distance = Math.sqrt((current.x - point2.x) ** 2 + (current.y - point2.y) ** 2);
        return distance < closest.distance ? { point: current, distance } : closest;
      }, { point: intersections[0], distance: Infinity }).point;
      setPoint2(closestIntersection);
    }

    const nextIndex = (currentPointIndex + 1) % totalSteps;
    const { intersections: nextIntersections } = getIndexPoints(nextIndex);
    if (nextIntersections.length > 0) {
      setNextPoint2(nextIntersections[0]);
    }
  }, [currentPointIndex, sides, chordLength, stepPoints, activeForward]);

  const checkValidAndSetCurrentPointIndex = (value: number) => {
    const nextPoint1 = stepPoints[value] || defaultPoint;
    const nextIntersections = getIndexPoints(value).intersections;
    const nextPoint2 = nextIntersections[0] || defaultPoint;

    if (Math.abs(nextPoint2.x - point2.x) > 10 || Math.abs(nextPoint2.y - point2.y) > 10) {
      const closestIndex = stepPoints.reduce((acc, curr, index) => {
        const distance = Math.sqrt((curr.x - point2.x) ** 2 + (curr.y - point2.y) ** 2);
        if (distance < acc.distance) {
          return { index, distance };
        }
        return acc;
      }, { index: 0, distance: Infinity });

      setPoint2(stepPoints[currentPointIndex]);
      setCurrentPointIndex(closestIndex.index + 1);
      console.log("switched to ", !activeForward ? "forward" : "backward");
      setActiveForward(!activeForward);
      return;
    }

    setCurrentPointIndex(value);
  };

  const { point1, intersections } = getIndexPoints(currentPointIndex);
  const polygonPoints = generatePolygon(sides);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (play) {
      interval = setInterval(() => {
        checkValidAndSetCurrentPointIndex((currentPointIndex + 1) % totalSteps);
      }, 5);
    }
    return () => clearInterval(interval);
  }, [play, currentPointIndex]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Chord Midpoint Path</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6"></div>
        <svg viewBox="-100 -100 200 200" className="w-full h-96 bg-slate-50">
          <path
            d={`M ${polygonPoints.map(p => `${p.x},${p.y}`).join(' L ')} Z`}
            fill="none"
            stroke="black"
            strokeWidth="1"
          />
          <circle cx={center.x} cy={center.y} r="3" fill="black" />
          {showNextPredictedPoint && (
            <circle cx={nextPoint2.x} cy={nextPoint2.y} r="4" fill="orange" />
          )}
          <line
            x1={point1.x}
            y1={point1.y}
            x2={point2.x}
            y2={point2.y}
            stroke="green"
            strokeWidth="2"
          />
          {/* Intersection points */}
          {showActiveNeighbors && intersections.map((point, index) => (
            <circle key={index} cx={point.x} cy={point.y} r="3" fill="grey" />
          ))}

          <circle cx={point2.x} cy={point2.y} r="3" fill="blue" />
          <circle cx={point1.x} cy={point1.y} r="3" fill="red" />


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
              max={totalSteps - 1 + 200}
              step={1}
              onValueChange={(value) => checkValidAndSetCurrentPointIndex(value[0])}
            />
          </div>

          <div>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded"
              onClick={() => setPlay(!play)}
            >
              {play ? 'Pause' : 'Play'}
            </button>

            <input className='m-2 ml-4 align-middle' type='checkbox' id='showNeighbors' checked={showActiveNeighbors} onChange={() => setShowActiveNeighbors(!showActiveNeighbors)} />
            <label className='align-middle select-none' htmlFor='showNeighbors'>Show Active Neighbors (grey)</label>
            
            <input className='m-2 ml-4 align-middle' type='checkbox' id='showNextPred' checked={showNextPredictedPoint} onChange={() => setShowNextPredictedPoint(!showNextPredictedPoint)} />
            <label className='align-middle select-none' htmlFor='showNextPred'>Show Next Predicted Point (orange)</label>
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
      </CardContent>
    </Card>
  );
};

export default ChordMidpoint;
