import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

const AdminDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'stats'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
  });

  const { data: users } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'users'));
      return snapshot.docs.length;
    },
  });

  const { data: applications } = useQuery({
    queryKey: ['admin-applications'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'applications'));
      return snapshot.docs.length;
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{applications || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Site Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">Healthy</div>
          </CardContent>
        </Card>
      </div>

      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Traffic Overview</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="visits" stroke="#7c4dff" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;