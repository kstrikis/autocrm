import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";
import { useEffect } from "react";

interface Props {
  className?: string;
}

export function AdminDashboard({ className }: Props): React.ReactElement {
  logger.methodEntry("AdminDashboard");

  useEffect((): (() => void) => {
    logger.info("AdminDashboard mounted");
    return () => {
      logger.info("AdminDashboard unmounted");
    };
  }, []);

  return (
    <div className={`space-y-4 p-8 pt-6 ${className}`}>
      <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
      <Tabs defaultValue="team" className="space-y-4">
        <TabsList>
          <TabsTrigger value="team">Team Management</TabsTrigger>
          <TabsTrigger value="routing">Routing Rules</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="team" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="routing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Routing Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Configure ticket routing rules and assignment logic.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <p>View team and agent performance metrics.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
