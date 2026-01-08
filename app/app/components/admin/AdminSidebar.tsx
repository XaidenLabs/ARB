"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    UsersIcon,
    BanknotesIcon,
    ChartBarIcon,
    ClipboardDocumentListIcon,
    ArrowRightOnRectangleIcon,
    SparklesIcon,
    MegaphoneIcon
} from "@heroicons/react/24/outline";
import { signOut } from "next-auth/react";

const navigation = [
    { name: "Dashboard", href: "/admin", icon: ChartBarIcon },
    { name: "Users", href: "/admin/users", icon: UsersIcon },
    { name: "Spotlights", href: "/admin/spotlights", icon: MegaphoneIcon },
    { name: "Transactions", href: "/admin/transactions", icon: ClipboardDocumentListIcon },
    { name: "Treasury", href: "/admin/treasury", icon: BanknotesIcon },
];

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(" ");
}

export function AdminSidebar() {
    const pathname = usePathname();

    return (
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-[#0F111A] border-r border-white/5 px-6 pb-4 w-64 min-h-screen">
            <div className="flex h-24 shrink-0 items-center justify-start">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-lg shadow-purple-500/20">
                        <SparklesIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white tracking-wide"><span className="text-purple-400 mr-2">Admin</span></h1>
                        <p className="text-[10px] text-gray-400 font-medium tracking-wider">AFRICA RESEARCH BASE</p>
                    </div>
                </div>
            </div>

            <nav className="flex flex-1 flex-col px-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 ml-2">Main Menu</div>
                <ul role="list" className="flex flex-1 flex-col gap-y-4">
                    <li>
                        <ul role="list" className="-mx-2 space-y-2">
                            {navigation.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <li key={item.name}>
                                        <Link
                                            href={item.href}
                                            className={classNames(
                                                isActive
                                                    ? "bg-gradient-to-r from-purple-500/20 to-transparent text-purple-300 border-l-4 border-purple-500"
                                                    : "text-gray-400 hover:bg-white/5 hover:text-white border-l-4 border-transparent",
                                                "group flex gap-x-3 py-3 pl-4 text-sm font-medium transition-all duration-200 ease-in-out rounded-r-lg"
                                            )}
                                        >
                                            <item.icon className={classNames(
                                                isActive ? "text-purple-400" : "text-gray-500 group-hover:text-white",
                                                "h-5 w-5 shrink-0 transition-colors"
                                            )} aria-hidden="true" />
                                            {item.name}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </li>

                    <li className="mt-auto">
                        <div className="rounded-2xl bg-gradient-to-br from-purple-900/50 to-indigo-900/50 p-4 border border-white/10 mb-6">
                            <p className="text-xs text-purple-200 mb-2">Logged in as Admin</p>
                            <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden mb-3">
                                <div className="h-full bg-purple-500 w-full animate-pulse"></div>
                            </div>
                            <button
                                onClick={() => signOut({ callbackUrl: "/" })}
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 hover:bg-white/20 py-2 text-xs font-semibold text-white transition-all"
                            >
                                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                                Sign Out
                            </button>
                        </div>
                    </li>
                </ul>
            </nav>
        </div>
    );
}
