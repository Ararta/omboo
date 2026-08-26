"use client";

import { useEffect, useMemo, useState } from "react";
import { Network, User } from "lucide-react";
import { api, ApiError } from "../../lib/api-client";
import type { EmployeeView } from "../../lib/types";
import { Card } from "../ui/Card";

interface TreeNode {
  employee: EmployeeView;
  children: TreeNode[];
}

function buildTree(employees: EmployeeView[]): TreeNode[] {
  const byId = new Map(employees.map((e) => [e.id, e]));
  const childrenOf = new Map<string, EmployeeView[]>();
  const roots: EmployeeView[] = [];

  for (const e of employees) {
    if (e.managerId && byId.has(e.managerId)) {
      if (!childrenOf.has(e.managerId)) childrenOf.set(e.managerId, []);
      childrenOf.get(e.managerId)!.push(e);
    } else {
      roots.push(e);
    }
  }

  function toNode(e: EmployeeView): TreeNode {
    return { employee: e, children: (childrenOf.get(e.id) ?? []).map(toNode) };
  }

  return roots.map(toNode);
}

function TreeBranch({ node, depth }: { node: TreeNode; depth: number }) {
  return (
    <div style={{ marginLeft: depth === 0 ? 0 : 20 }}>
      <div className="mb-1.5 flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2">
        <User size={14} className="text-seal" />
        <div>
          <div className="text-[13px] font-semibold text-ink">{node.employee.name}</div>
          <div className="text-[11.5px] text-muted">{node.employee.position}</div>
        </div>
      </div>
      {node.children.length > 0 && (
        <div className="ml-2 border-l border-dashed border-line pl-3">
          {node.children.map((child) => (
            <TreeBranch key={child.employee.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function OrgChartSection() {
  const [employees, setEmployees] = useState<EmployeeView[]>([]);
  const [error, setError] = useState("");

  async function load() {
    setEmployees(await api.get<EmployeeView[]>("/employees"));
  }

  useEffect(() => {
    load();
  }, []);

  async function setManager(employeeId: string, managerId: string) {
    setError("");
    try {
      await api.patch(`/employees/${employeeId}`, { managerId: managerId || null });
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Չհաջողվեց պահպանել։");
    }
  }

  const tree = useMemo(() => buildTree(employees), [employees]);

  return (
    <>
      <div className="my-6 font-serif text-[17px] text-ink">Կազմակերպական կառուցվածք</div>

      <Card className="mb-3.5">
        <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-seal">Ղեկավարների նշանակում</div>
        <div className="flex flex-col gap-2">
          {employees.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-2 first:border-t-0">
              <div className="text-[13px] font-semibold text-ink">{e.name}</div>
              <select
                value={e.managerId ?? ""}
                onChange={(ev) => setManager(e.id, ev.target.value)}
                className="rounded-md border border-line px-2.5 py-1.5 text-sm"
              >
                <option value="">— Ղեկավար չկա (վերին մակարդակ) —</option>
                {employees
                  .filter((m) => m.id !== e.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </div>
          ))}
        </div>
        {!!error && <div className="mt-2 text-[12.5px] text-[#841320]">{error}</div>}
      </Card>

      <Card>
        <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-seal">
          <Network size={13} />
          Հիերարխիա
        </div>
        {tree.length === 0 && <div className="text-[12.5px] text-muted">Աշխատողներ չկան։</div>}
        {tree.map((node) => (
          <TreeBranch key={node.employee.id} node={node} depth={0} />
        ))}
      </Card>
    </>
  );
}
