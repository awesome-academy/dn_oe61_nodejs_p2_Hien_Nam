export class CategoryResponse {
  rootCategory: RootCategory;
  childCategories: ChildCategories[];
}

export class RootCategory {
  id: number;
  name: string;
  parent: number | '';
}

export class ChildCategories {
  id: number;
  name: string;
  parent: number | '';
}
