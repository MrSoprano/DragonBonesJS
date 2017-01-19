namespace dragonBones {
    /**
     * @language zh_CN
     * Pixi 工厂。
     * @version DragonBones 3.0
     */
    export class PhaserFactory extends BaseFactory {
        private static _factory: PhaserFactory = null;
        /**
         * @private
         */
        public static _eventManager: PhaserArmatureDisplay = null;
        /**
         * @private
         */
        public static _clock: WorldClock = null;

        public static _game: Phaser.Game;

        private static _clockHandler(passedTime: number): void {
            PhaserFactory._clock.advanceTime(-1); // passedTime !?
        }
        /**
         * @language zh_CN
         * 一个可以直接使用的全局工厂实例。
         * @version DragonBones 4.7
         */
        public static get factory(): PhaserFactory {
            if (!PhaserFactory._factory) {
                PhaserFactory._factory = new PhaserFactory(null,this._game);
            }

            return PhaserFactory._factory;
        }
        /**
         * @language zh_CN
         * 创建一个工厂。 (通常只需要一个全局工厂实例)
         * @param dataParser 龙骨数据解析器，如果不设置，则使用默认解析器。
         * @version DragonBones 3.0
         */
        public constructor(dataParser: DataParser = null, game: Phaser.Game) {
            super(dataParser);

            if (!PhaserFactory._eventManager) {
                PhaserFactory._eventManager = new PhaserArmatureDisplay(game);
                PhaserFactory._clock = new WorldClock();
                PhaserFactory._game = game; // Added to Phaser Context
                PhaserFactory._game.time.events.loop(0,PhaserFactory._clockHandler,PhaserFactory._game); //added phaser ticker
            }
        }
        /**
         * @private
         */
        protected _generateTextureAtlasData(textureAtlasData: PhaserTextureAtlasData, textureAtlas: PIXI.BaseTexture): PhaserTextureAtlasData {
            if (textureAtlasData) {
                textureAtlasData.texture = textureAtlas;
            }
            else {
                textureAtlasData = BaseObject.borrowObject(PhaserTextureAtlasData);
            }

            return textureAtlasData;
        }
        /**
         * @private
         */
        protected _generateArmature(dataPackage: BuildArmaturePackage): Armature {
            const armature = BaseObject.borrowObject(Armature);
            const armatureDisplay = new PhaserArmatureDisplay(PhaserFactory._game);
            armatureDisplay._armature = armature;

            armature._init(
                dataPackage.armature, dataPackage.skin,
                armatureDisplay, armatureDisplay, PhaserFactory._eventManager
            );

            return armature;
        }
        /**
         * @private
         */
        protected _generateSlot(dataPackage: BuildArmaturePackage, skinSlotData: SkinSlotData, armature: Armature): Slot {
            const slot = BaseObject.borrowObject(PhaserSlot);
            slot._init(skinSlotData,
                new Phaser.Sprite(PhaserFactory._game,null,null),
                new Phaser.Rope(PhaserFactory._game,null,null,null,null,[]) // TODO ....hmm expriment
            );

            const displayList = [];
            for (let i = 0, l = skinSlotData.displays.length; i < l; ++i) {
                const displayData = skinSlotData.displays[i];
                switch (displayData.type) {
                    case DisplayType.Image:
                        if (!displayData.texture || dataPackage.textureAtlasName) {
                            displayData.texture = this._getTextureData(dataPackage.textureAtlasName || dataPackage.dataName, displayData.path);
                        }

                        displayList.push(slot.rawDisplay);
                        break;

                    case DisplayType.Mesh:
                        if (!displayData.texture || dataPackage.textureAtlasName) {
                            displayData.texture = this._getTextureData(dataPackage.textureAtlasName || dataPackage.dataName, displayData.path);
                        }

                        if (!displayData.mesh && displayData.share) {
                            displayData.mesh = skinSlotData.getMesh(displayData.share);
                        }

                        displayList.push(slot.meshDisplay);
                        break;

                    case DisplayType.Armature:
                        const childArmature = this.buildArmature(displayData.path, dataPackage.dataName, null, dataPackage.textureAtlasName);
                        if (childArmature) {
                            childArmature.inheritAnimation = displayData.inheritAnimation;
                            if (!childArmature.inheritAnimation) {
                                const actions = skinSlotData.slot.actions.length > 0 ? skinSlotData.slot.actions : childArmature.armatureData.actions;
                                if (actions.length > 0) {
                                    for (let i = 0, l = actions.length; i < l; ++i) {
                                        childArmature._bufferAction(actions[i]);
                                    }
                                }
                                else {
                                    childArmature.animation.play();
                                }
                            }

                            displayData.armature = childArmature.armatureData; // 
                        }

                        displayList.push(childArmature);
                        break;

                    default:
                        displayList.push(null);
                        break;
                }
            }

            slot._setDisplayList(displayList);

            return slot;
        }
        /**
         * @language zh_CN
             * 创建一个指定名称的骨架，并使用骨架的显示容器来更新骨架动画。
         * @param armatureName 骨架名称。
         * @param dragonBonesName 龙骨数据名称，如果未设置，将检索所有的龙骨数据，如果多个数据中包含同名的骨架数据，可能无法创建出准确的骨架。
         * @param skinName 皮肤名称，如果未设置，则使用默认皮肤。
         * @param textureAtlasName 贴图集数据名称，如果未设置，则使用龙骨数据。
         * @returns 骨架的显示容器。
         * @see dragonBones.PixiArmatureDisplay
         * @version DragonBones 4.5
         */
        public buildArmatureDisplay(armatureName: string, dragonBonesName: string = null, skinName: string = null, textureAtlasName: string = null): PhaserArmatureDisplay {
            const armature = this.buildArmature(armatureName, dragonBonesName, skinName, textureAtlasName);
            if (armature) {
                const armatureDisplay = armature.display as PhaserArmatureDisplay;
                PhaserFactory._clock.add(armature);
                return armatureDisplay;
            }

            return null;
        }
        /**
         * @language zh_CN
         * 获取带有指定贴图的显示对象。
         * @param textureName 指定的贴图名称。
         * @param dragonBonesName 指定的龙骨数据名称，如果未设置，将检索所有的龙骨数据。
         * @version DragonBones 3.0
         */
        public getTextureDisplay(textureName: string, dragonBonesName: string = null): PIXI.Sprite {
            const textureData = this._getTextureData(dragonBonesName, textureName) as PhaserTextureData;
            if (textureData) {
                if (!textureData.texture) {
                    const textureAtlasTexture = (textureData.parent as PhaserTextureAtlasData).texture;
                    const originSize = new PIXI.Rectangle(0, 0, textureData.region.width, textureData.region.height);
                    textureData.texture = new PIXI.Texture(
                        textureAtlasTexture,
                        null,
                        <PIXI.Rectangle><any>textureData.region,
                        originSize
                    );
                }

                return new PIXI.Sprite(textureData.texture);
            }

            return null;
        }
        /**
         * @language zh_CN
         * 获取全局声音事件管理器。
         * @version DragonBones 4.5
         */
        public get soundEventManater(): PhaserArmatureDisplay {
            return PhaserFactory._eventManager;
        }
    }
}