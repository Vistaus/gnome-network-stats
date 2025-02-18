const { Gio, GObject } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { logger } = Me.imports.utils.Logger;
const { DisplayMode } = Me.imports.utils.Constants;
const { SettingKeys } = Me.imports.utils.Constants;

const kRefreshInterval = 2 * 1000; // milliseconds
const kSchemaName = "org.gnome.shell.extensions.network-stats";


/*
* AppSettingsModel represents application setttings and user prefrences.
*/
class AppSettingsModel {

    constructor() {
        this._schema = undefined;
        this._settingListeners = [];
        this._resetHours = 0;
        this._resetMinutes = 0;
        this._refreshInterval = kRefreshInterval;
        this._displayMode = DisplayMode.DEFAULT;
        this._devicesInfoMap = {};
    }

    init() {
        this.load();
        this._settingsC = this.schema.connect("changed", () => {
            // setting changed - get the new values
            logger.info("Prefrences/Settings value changed");
            this.load();
            this.notifyListerners();
        });
    }

    deinit() {
        if (this._settingsC) {
            this.schema.disconnect(this._settingsC);
            this._settingsC = undefined;
        }
    }

    get schema() {
        if (!this._schema) {
            const schemaDir = Me.dir.get_child('schemas').get_path();
            const schemaSource = Gio.SettingsSchemaSource.new_from_directory(schemaDir, Gio.SettingsSchemaSource.get_default(), false);
            const schema = schemaSource.lookup(kSchemaName, false);
            this._schema = new Gio.Settings({ settings_schema: schema });
        }
        return this._schema;
    }

    load() {
        this._refreshInterval = this.schema.get_int(SettingKeys.REFRESH_INTERVAL);
        this._displayMode = this.schema.get_string(SettingKeys.DISPLAY_MODE);
        this._resetHours = this.schema.get_int(SettingKeys.RESET_HOURS);
        this._resetMinutes = this.schema.get_int(SettingKeys.RESET_MINUTES);
        const str = this.schema.get_string(SettingKeys.DEVICES_INFO);
        this._devicesInfoMap = JSON.parse(str);
        // logger.debug(`new values [ refreshInterval: ${this._refreshInterval} displayMode: ${this._displayMode} resetTime: ${this._resetHours} : ${this._resetMinutes}]`);
        // logger.debug(`deivicesInfoMap ${str}`);
    }

    save() {
        // right now we are chaning only mode value.
        this.schema.set_string(SettingKeys.DISPLAY_MODE, this._displayMode);
        //this.schema.set_string(SettingKeys.DEVICES_INFO, JSON.stringify(this._lastResetMap));
    }

    get refreshInterval() {
        return this._refreshInterval || kRefreshInterval;
    }

    get displayMode() {
        return this._displayMode || DisplayMode.DEFAULT;
    }

    set displayMode(mode) {
        this._displayMode = mode;
        this.save();
    }

    getResetTime() {
        const date = new Date();
        date.setHours(this._resetHours);
        date.setMinutes(this._resetMinutes);
        date.setSeconds(0);
        return date;
    }

    get devicesInfoMap() {
        return this._devicesInfoMap;
    }

    set devicesInfoMap(info) {
        this._devicesInfoMap = { ...this._devicesInfoMap, ...info };
        this.schema.set_string(SettingKeys.DEVICES_INFO, JSON.stringify(this._devicesInfoMap));
    }

    getDeviceInfo(name) {
        return this._devicesInfoMap[name] || {};
    }

    setDeviceInfo(name, info) {
        this._devicesInfoMap[name] = info;
        this.schema.set_string(SettingKeys.DEVICES_INFO, JSON.stringify(this._devicesInfoMap));
    }

    updateDeviceInfo(name, info) {
        this._devicesInfoMap[name] = { ...this.devicesInfoMap[name], ...info };
        this.schema.set_string(SettingKeys.DEVICES_INFO, JSON.stringify(this._devicesInfoMap));
    }

    notifyListerners() {
        for (const listener of this._settingListeners) {
            listener();
        }
    }

    subscribe(listener) {
        this._settingListeners.push(listener);
    }

    unsubscribe(listener) {
        const index = this._settingListeners.indexOf(listener);
        if (index != -1) {
            this._settingListeners.splice(index, 1);
        }
    }
}

var appSettingsModel = new AppSettingsModel;