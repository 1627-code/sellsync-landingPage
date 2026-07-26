import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";

export function AISummaryCard({
  title,
  summary,
  confidence,
}: {
  title: string;
  summary: string;
  confidence: number;
}) {
  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            {title}
          </CardTitle>
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
            Confidence {Math.round(confidence)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-700">{summary}</p>
        <Progress value={confidence} className="h-2" />
      </CardContent>
    </Card>
  );
}
