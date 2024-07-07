import { query } from "sdk/db";
import { producer } from "sdk/messaging";
import { extensions } from "sdk/extensions";
import { dao as daoApi } from "sdk/db";

export interface ItemInStoreEntity {
    readonly Id: number;
    Name?: string;
    Price?: number;
    Currency?: number;
    Product?: number;
    AmountInShop?: number;
    Purchase?: number;
}

export interface ItemInStoreCreateEntity {
    readonly Name?: string;
    readonly Price?: number;
    readonly Currency?: number;
    readonly Product?: number;
    readonly AmountInShop?: number;
    readonly Purchase?: number;
}

export interface ItemInStoreUpdateEntity extends ItemInStoreCreateEntity {
    readonly Id: number;
}

export interface ItemInStoreEntityOptions {
    $filter?: {
        equals?: {
            Id?: number | number[];
            Name?: string | string[];
            Price?: number | number[];
            Currency?: number | number[];
            Product?: number | number[];
            AmountInShop?: number | number[];
            Purchase?: number | number[];
        };
        notEquals?: {
            Id?: number | number[];
            Name?: string | string[];
            Price?: number | number[];
            Currency?: number | number[];
            Product?: number | number[];
            AmountInShop?: number | number[];
            Purchase?: number | number[];
        };
        contains?: {
            Id?: number;
            Name?: string;
            Price?: number;
            Currency?: number;
            Product?: number;
            AmountInShop?: number;
            Purchase?: number;
        };
        greaterThan?: {
            Id?: number;
            Name?: string;
            Price?: number;
            Currency?: number;
            Product?: number;
            AmountInShop?: number;
            Purchase?: number;
        };
        greaterThanOrEqual?: {
            Id?: number;
            Name?: string;
            Price?: number;
            Currency?: number;
            Product?: number;
            AmountInShop?: number;
            Purchase?: number;
        };
        lessThan?: {
            Id?: number;
            Name?: string;
            Price?: number;
            Currency?: number;
            Product?: number;
            AmountInShop?: number;
            Purchase?: number;
        };
        lessThanOrEqual?: {
            Id?: number;
            Name?: string;
            Price?: number;
            Currency?: number;
            Product?: number;
            AmountInShop?: number;
            Purchase?: number;
        };
    },
    $select?: (keyof ItemInStoreEntity)[],
    $sort?: string | (keyof ItemInStoreEntity)[],
    $order?: 'asc' | 'desc',
    $offset?: number,
    $limit?: number,
}

interface ItemInStoreEntityEvent {
    readonly operation: 'create' | 'update' | 'delete';
    readonly table: string;
    readonly entity: Partial<ItemInStoreEntity>;
    readonly key: {
        name: string;
        column: string;
        value: number;
    }
}

interface ItemInStoreUpdateEntityEvent extends ItemInStoreEntityEvent {
    readonly previousEntity: ItemInStoreEntity;
}

export class ItemInStoreRepository {

    private static readonly DEFINITION = {
        table: "CODBEX_ITEMINSTORE",
        properties: [
            {
                name: "Id",
                column: "ITEMINSTORE_ID",
                type: "INTEGER",
                id: true,
                autoIncrement: true,
            },
            {
                name: "Name",
                column: "ITEMINSTORE_NAME",
                type: "VARCHAR",
            },
            {
                name: "Price",
                column: "ITEMINSTORE_PRICE",
                type: "INTEGER",
            },
            {
                name: "Currency",
                column: "ITEMINSTORE_CURRENCY",
                type: "INTEGER",
            },
            {
                name: "Product",
                column: "ITEMINSTORE_PRODUCT",
                type: "INTEGER",
            },
            {
                name: "AmountInShop",
                column: "ITEMINSTORE_AMOUNTINSHOP",
                type: "INTEGER",
            },
            {
                name: "Purchase",
                column: "ITEMINSTORE_PURCHASE",
                type: "INTEGER",
            }
        ]
    };

    private readonly dao;

    constructor(dataSource = "DefaultDB") {
        this.dao = daoApi.create(ItemInStoreRepository.DEFINITION, null, dataSource);
    }

    public findAll(options?: ItemInStoreEntityOptions): ItemInStoreEntity[] {
        return this.dao.list(options);
    }

    public findById(id: number): ItemInStoreEntity | undefined {
        const entity = this.dao.find(id);
        return entity ?? undefined;
    }

    public create(entity: ItemInStoreCreateEntity): number {
        const id = this.dao.insert(entity);
        this.triggerEvent({
            operation: "create",
            table: "CODBEX_ITEMINSTORE",
            entity: entity,
            key: {
                name: "Id",
                column: "ITEMINSTORE_ID",
                value: id
            }
        });
        return id;
    }

    public update(entity: ItemInStoreUpdateEntity): void {
        const previousEntity = this.findById(entity.Id);
        this.dao.update(entity);
        this.triggerEvent({
            operation: "update",
            table: "CODBEX_ITEMINSTORE",
            entity: entity,
            previousEntity: previousEntity,
            key: {
                name: "Id",
                column: "ITEMINSTORE_ID",
                value: entity.Id
            }
        });
    }

    public upsert(entity: ItemInStoreCreateEntity | ItemInStoreUpdateEntity): number {
        const id = (entity as ItemInStoreUpdateEntity).Id;
        if (!id) {
            return this.create(entity);
        }

        const existingEntity = this.findById(id);
        if (existingEntity) {
            this.update(entity as ItemInStoreUpdateEntity);
            return id;
        } else {
            return this.create(entity);
        }
    }

    public deleteById(id: number): void {
        const entity = this.dao.find(id);
        this.dao.remove(id);
        this.triggerEvent({
            operation: "delete",
            table: "CODBEX_ITEMINSTORE",
            entity: entity,
            key: {
                name: "Id",
                column: "ITEMINSTORE_ID",
                value: id
            }
        });
    }

    public count(options?: ItemInStoreEntityOptions): number {
        return this.dao.count(options);
    }

    public customDataCount(): number {
        const resultSet = query.execute('SELECT COUNT(*) AS COUNT FROM "CODBEX_ITEMINSTORE"');
        if (resultSet !== null && resultSet[0] !== null) {
            if (resultSet[0].COUNT !== undefined && resultSet[0].COUNT !== null) {
                return resultSet[0].COUNT;
            } else if (resultSet[0].count !== undefined && resultSet[0].count !== null) {
                return resultSet[0].count;
            }
        }
        return 0;
    }

    private async triggerEvent(data: ItemInStoreEntityEvent | ItemInStoreUpdateEntityEvent) {
        const triggerExtensions = await extensions.loadExtensionModules("project_fruit_and_vegetables_dirigable-Purchase-ItemInStore", ["trigger"]);
        triggerExtensions.forEach(triggerExtension => {
            try {
                triggerExtension.trigger(data);
            } catch (error) {
                console.error(error);
            }            
        });
        producer.topic("project_fruit_and_vegetables_dirigable-Purchase-ItemInStore").send(JSON.stringify(data));
    }
}
