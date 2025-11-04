import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Bookmark } from "lucide-react";

interface ProjectFiltersProps {
  categories: string[];
  selectedCategories: string[];
  onCategoryChange: (category: string, checked: boolean) => void;
  selectedBudget: string;
  onBudgetChange: (value: string) => void;
  selectedDeadline: string;
  onDeadlineChange: (value: string) => void;
  proposalsFilter: string;
  onProposalsFilterChange: (value: string) => void;
  onSaveSearch: () => void;
}

const BUDGET_RANGES = [
  { label: 'Todos', value: 'all' },
  { label: 'Até R$300', value: '0-300' },
  { label: 'R$300 a R$800', value: '300-800' },
  { label: 'R$800 a R$2.000', value: '800-2000' },
  { label: 'Acima de R$2.000', value: '2000-' },
];

export function ProjectFilters({
  categories,
  selectedCategories,
  onCategoryChange,
  selectedBudget,
  onBudgetChange,
  selectedDeadline,
  onDeadlineChange,
  proposalsFilter,
  onProposalsFilterChange,
  onSaveSearch,
}: ProjectFiltersProps) {
  return (
    <aside className="w-full space-y-6">
      {/* Categoria de Projeto */}
      <div>
        <h3 className="font-semibold mb-3">Categoria de projeto</h3>
        <div className="space-y-2">
          {categories.map((category) => (
            <div key={category} className="flex items-center space-x-2">
              <Checkbox
                id={category}
                checked={selectedCategories.includes(category)}
                onCheckedChange={(checked) => onCategoryChange(category, checked as boolean)}
              />
              <Label htmlFor={category} className="text-sm font-normal cursor-pointer">
                {category}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Data de Publicação */}
      <div>
        <h3 className="font-semibold mb-3">Data de publicação</h3>
        <Select value={selectedDeadline} onValueChange={onDeadlineChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent modal={false}>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Última semana</SelectItem>
            <SelectItem value="month">Último mês</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Orçamento */}
      <div>
        <h3 className="font-semibold mb-3">Orçamento</h3>
        <Select value={selectedBudget} onValueChange={onBudgetChange}>
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent modal={false}>
            {BUDGET_RANGES.map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Propostas Recebidas */}
      <div>
        <h3 className="font-semibold mb-3">Propostas recebidas</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={proposalsFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onProposalsFilterChange('all')}
          >
            Todos
          </Button>
          <Button
            variant={proposalsFilter === '0-4' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onProposalsFilterChange('0-4')}
          >
            0-4 propostas
          </Button>
          <Button
            variant={proposalsFilter === '5+' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onProposalsFilterChange('5+')}
          >
            5+ propostas
          </Button>
        </div>
      </div>

      <Separator />

      {/* Salvar Busca */}
      <Button
        variant="default"
        className="w-full"
        onClick={onSaveSearch}
      >
        <Bookmark className="h-4 w-4 mr-2" />
        Salvar busca
      </Button>
    </aside>
  );
}
