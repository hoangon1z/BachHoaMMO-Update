'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Users, ShoppingBag, User as UserIcon, Mail, Calendar, Wallet, Shield, Ban, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { PageHeader, StatsCard, FilterBar, DataTable, EmptyState, StatusBadge, Pagination } from '@/components/admin';
import { Button } from '@/components/ui/button';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isSeller: boolean;
  isBanned: boolean;
  banReason?: string;
  bannedAt?: string;
  balance: number;
  createdAt: string;
}

interface Stats {
  totalUsers: number;
  totalAdmins: number;
  totalSellers: number;
  totalBuyers: number;
  totalBanned: number;
}

export default function UsersManagementPage() {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [filterRole, setFilterRole] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalAdmins: 0, totalSellers: 0, totalBuyers: 0, totalBanned: 0 });
  const itemsPerPage = 20;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user, filterRole, currentPage, debouncedSearch]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();

      // Handle filter role - SELLER is isSeller=true, not role=SELLER
      if (filterRole === 'SELLER') {
        params.append('isSeller', 'true');
      } else if (filterRole === 'BANNED') {
        // Special filter for banned users
      } else if (filterRole) {
        params.append('role', filterRole);
      }

      params.append('limit', String(itemsPerPage));
      params.append('offset', String((currentPage - 1) * itemsPerPage));

      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setTotalItems(data.total);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadge = (role: string, isSeller: boolean, isBanned: boolean) => {
    if (isBanned) {
      return (
        <StatusBadge variant="error" icon={<Ban className="w-3 h-3" />}>
          Đã khóa
        </StatusBadge>
      );
    }
    if (role === 'ADMIN') {
      return (
        <StatusBadge variant="warning" icon={<Shield className="w-3 h-3" />}>
          Admin
        </StatusBadge>
      );
    }
    if (isSeller) {
      return (
        <StatusBadge variant="success" icon={<ShoppingBag className="w-3 h-3" />}>
          Seller
        </StatusBadge>
      );
    }
    return (
      <StatusBadge variant="info" icon={<UserIcon className="w-3 h-3" />}>
        Buyer
      </StatusBadge>
    );
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const columns = [
    {
      key: 'user',
      title: 'Người dùng',
      render: (u: User) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-gray-900 font-bold">
            {u.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{u.name}</p>
            <p className="text-xs text-gray-500">ID: {u.id.slice(0, 8)}...</p>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      title: 'Email',
      render: (u: User) => (
        <div className="flex items-center gap-2 text-gray-600">
          <Mail className="w-4 h-4 text-gray-400" />
          <span className="text-sm">{u.email}</span>
        </div>
      ),
    },
    {
      key: 'role',
      title: 'Trạng thái',
      align: 'center' as const,
      render: (u: User) => getRoleBadge(u.role, u.isSeller, u.isBanned),
    },
    {
      key: 'balance',
      title: 'Số dư',
      align: 'right' as const,
      sortable: true,
      render: (u: User) => (
        <div className="flex items-center justify-end gap-2">
          <Wallet className="w-4 h-4 text-green-500" />
          <span className="font-semibold text-green-600">
            {u.balance.toLocaleString('vi-VN')}đ
          </span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      title: 'Ngày tạo',
      sortable: true,
      render: (u: User) => (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Calendar className="w-4 h-4" />
          {new Date(u.createdAt).toLocaleDateString('vi-VN')}
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Thao tác',
      align: 'center' as const,
      render: (u: User) => (
        <Link href={`/admin/users/${u.id}`}>
          <Button size="sm" variant="outline" className="hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200">
            Xem chi tiết
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý người dùng"
        description="Xem và quản lý tất cả người dùng trong hệ thống"
        icon={<Users className="w-6 h-6" />}
        breadcrumbs={[{ label: 'Người dùng' }]}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Tổng người dùng"
          value={stats.totalUsers}
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <StatsCard
          title="Admins"
          value={stats.totalAdmins}
          icon={<Shield className="w-5 h-5" />}
          color="amber"
        />
        <StatsCard
          title="Sellers"
          value={stats.totalSellers}
          icon={<ShoppingBag className="w-5 h-5" />}
          color="green"
        />
        <StatsCard
          title="Buyers"
          value={stats.totalBuyers}
          icon={<UserIcon className="w-5 h-5" />}
          color="gray"
        />
        <StatsCard
          title="Đã khóa"
          value={stats.totalBanned}
          icon={<Ban className="w-5 h-5" />}
          color="red"
        />
      </div>

      {/* Filters */}
      <FilterBar
        searchValue={searchQuery}
        onSearchChange={(value) => {
          setSearchQuery(value);
        }}
        searchPlaceholder="Tìm kiếm theo tên hoặc email..."
        filters={[
          {
            key: 'role',
            label: 'Tất cả vai trò',
            value: filterRole,
            options: [
              { value: 'ADMIN', label: 'Admin' },
              { value: 'SELLER', label: 'Seller' },
              { value: 'BUYER', label: 'Buyer' },
            ],
            onChange: (value) => {
              setFilterRole(value);
              setCurrentPage(1);
            },
          },
        ]}
        showClearButton
        onClearFilters={() => {
          setFilterRole('');
          setSearchQuery('');
          setCurrentPage(1);
        }}
      />

      {/* Table */}
      <DataTable
        data={users}
        columns={columns}
        keyExtractor={(u) => u.id}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            icon={<Users className="w-10 h-10 text-gray-400" />}
            title="Không tìm thấy người dùng"
            description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm"
          />
        }
      />

      {/* Pagination */}
      {!isLoading && totalItems > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
