import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useHealthChecks } from "@/hooks/use-health-data";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface ChartDataPoint {
  time: string;
  timestamp: Date;
  avgResponseTime: number;
  healthy: number;
  degraded: number;
  errors: number;
}

export function HealthHistoryChart() {
  const { data: checks, isLoading } = useHealthChecks(500);

  // Group checks by 5-minute intervals
  const chartData: ChartDataPoint[] = [];
  
  if (checks && checks.length > 0) {
    const grouped = new Map<string, typeof checks>();
    
    checks.forEach(check => {
      const date = new Date(check.created_at);
      // Round to 5-minute intervals
      date.setMinutes(Math.floor(date.getMinutes() / 5) * 5);
      date.setSeconds(0);
      date.setMilliseconds(0);
      const key = date.toISOString();
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(check);
    });

    // Convert to chart data
    Array.from(grouped.entries())
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .slice(-24) // Last 2 hours (24 x 5 min intervals)
      .forEach(([timestamp, checksInInterval]) => {
        const responseTimes = checksInInterval
          .filter(c => c.response_time_ms !== null)
          .map(c => c.response_time_ms!);
        
        chartData.push({
          time: format(new Date(timestamp), "HH:mm", { locale: de }),
          timestamp: new Date(timestamp),
          avgResponseTime: responseTimes.length > 0 
            ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
            : 0,
          healthy: checksInInterval.filter(c => c.status === "healthy").length,
          degraded: checksInInterval.filter(c => c.status === "degraded").length,
          errors: checksInInterval.filter(c => c.status === "error").length,
        });
      });
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verlauf</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-muted animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verlauf</CardTitle>
          <CardDescription>Noch keine Daten verfügbar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Führe einen Health-Check durch, um Daten zu sammeln
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verlauf</CardTitle>
        <CardDescription>
          Systemstatus und Antwortzeiten der letzten 2 Stunden
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="time" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              yAxisId="left"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              label={{ 
                value: 'ms', 
                angle: -90, 
                position: 'insideLeft',
                fill: 'hsl(var(--muted-foreground))'
              }}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              label={{ 
                value: 'Anzahl', 
                angle: 90, 
                position: 'insideRight',
                fill: 'hsl(var(--muted-foreground))'
              }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="avgResponseTime" 
              stroke="hsl(217, 91%, 60%)"
              strokeWidth={2}
              dot={false}
              name="Ø Antwortzeit (ms)"
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="healthy" 
              stroke="hsl(142, 76%, 36%)"
              strokeWidth={2}
              dot={false}
              name="Gesund"
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="degraded" 
              stroke="hsl(45, 93%, 47%)"
              strokeWidth={2}
              dot={false}
              name="Langsam"
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="errors" 
              stroke="hsl(0, 84%, 60%)"
              strokeWidth={2}
              dot={false}
              name="Fehler"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
