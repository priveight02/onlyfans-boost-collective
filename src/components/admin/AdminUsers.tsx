import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const AdminUsers = () => {
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'users'));
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    },
  });

  if (isLoading) {
    return <div>Loading users...</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Join Date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users?.map((user: any) => (
            <TableRow key={user.id}>
              <TableCell>{user.email}</TableCell>
              <TableCell>{new Date(user.createdAt?.seconds * 1000).toLocaleDateString()}</TableCell>
              <TableCell>{user.status || 'Active'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default AdminUsers;