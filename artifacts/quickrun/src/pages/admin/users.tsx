import { useListUsers, useUpdateUserStatus, getListUsersQueryKey } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function AdminUsers() {
  const { data } = useListUsers({ limit: 50 }, { query: { queryKey: getListUsersQueryKey({ limit: 50 }) } });
  const updateStatusMutation = useUpdateUserStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleToggleStatus = (userId: number, currentStatus: boolean) => {
    updateStatusMutation.mutate({ userId, data: { isActive: !currentStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "User status updated" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users Directory</h1>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">{u.role}</Badge>
                  </TableCell>
                  <TableCell>
                    {u.isOnline ? (
                      <span className="flex items-center gap-2 text-xs font-medium text-green-600">
                        <span className="h-2 w-2 rounded-full bg-green-500"></span> Online
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <span className="h-2 w-2 rounded-full bg-muted-foreground"></span> Offline
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch 
                      checked={u.isActive} 
                      onCheckedChange={() => handleToggleStatus(u.id, u.isActive)}
                      disabled={updateStatusMutation.isPending || u.role === 'admin'}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
