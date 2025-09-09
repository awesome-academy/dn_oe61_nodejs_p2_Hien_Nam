export class CategoryResponse {
  rootCategory: RootCategory;
  childCategories: ChildCategories[];
}

export class RootCategory {
  id: number;
  name: string;
  parent: number | '';
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export class ChildCategories {
  id: number;
  name: string;
  parent: number | '';
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export class CategoriesResponse {
  id: number;
  name: string;
  parentId: number | '';
  createdAt: Date;
  updatedAt: Date;
}
