import { Injectable } from '@nestjs/common';
import { PaginationParmas, PaginationResult } from '@app/common/interfaces/pagination';
import { CountArgs, FindManyArgs, PrismaModel } from '../types/prisma.type';

@Injectable()
export class PaginationService {
  private readonly defaultPageSize = 50;
  private readonly defaultPage = 1;
  private readonly maxPageSize = 50;

  async queryWithPagination<TEntity, A extends FindManyArgs<PrismaModel<TEntity>>>(
    prismaModel: PrismaModel<TEntity>,
    options: PaginationParmas,
    findOptions: A & { where?: CountArgs<PrismaModel<TEntity>> },
  ): Promise<PaginationResult<TEntity>> {
    const page = Number(options.page) > 0 ? Number(options.page) : this.defaultPage;
    const pageSize =
      Number(options.pageSize) > 0
        ? Math.min(Number(options.pageSize), this.maxPageSize)
        : this.defaultPageSize;

    const totalItems = await prismaModel.count({
      where: findOptions && 'where' in findOptions ? findOptions.where : undefined,
    });

    const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const skip = (safePage - 1) * pageSize;

    const items = await prismaModel.findMany({
      skip,
      take: pageSize,
      ...findOptions,
    });

    return {
      items,
      paginations: {
        currentPage: safePage,
        totalPages,
        pageSize,
        totalItems,
        itemsOnPage: items.length,
      },
    };
  }
}
