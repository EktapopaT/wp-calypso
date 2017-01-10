/**
 * External dependencies
 */
import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import LinkedStateMixin from 'react-addons-linked-state-mixin';
import i18n, { localize } from 'i18n-calypso';
import Debug from 'debug';
import emailValidator from 'email-validator';
import {
	debounce,
	flowRight as compose,
	map,
	size,
} from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

/**
 * Internal dependencies
 */
import LanguageSelector from 'components/forms/language-selector';
import MeSidebarNavigation from 'me/sidebar-navigation';
import { protectForm } from 'lib/protect-form';
import formBase from 'me/form-base';
import config from 'config';
import Card from 'components/card';
import FormTextInput from 'components/forms/form-text-input';
import FormTextValidation from 'components/forms/form-input-validation';
import FormCheckbox from 'components/forms/form-checkbox';
import FormFieldset from 'components/forms/form-fieldset';
import FormLabel from 'components/forms/form-label';
import FormLegend from 'components/forms/form-legend';
import FormSettingExplanation from 'components/forms/form-setting-explanation';
import FormButton from 'components/forms/form-button';
import FormButtonsBar from 'components/forms/form-buttons-bar';
import FormSectionHeading from 'components/forms/form-section-heading';
import FormRadio from 'components/forms/form-radio';
import ReauthRequired from 'me/reauth-required';
import twoStepAuthorization from 'lib/two-step-authorization';
import Notice from 'components/notice';
import NoticeAction from 'components/notice/notice-action';
import observe from 'lib/mixins/data-observe';
import eventRecorder from 'me/event-recorder';
import Main from 'components/main';
import SitesDropdown from 'components/sites-dropdown';
import { successNotice, errorNotice } from 'state/notices/actions';
import { getLanguage } from 'lib/i18n-utils';

import _sites from 'lib/sites-list';
import _user from 'lib/user';

const sites = _sites();
const user = _user();

/**
 * Debug instance
 */
let debug = new Debug( 'calypso:me:account' );

const Account = React.createClass( {

	displayName: 'Account',

	mixins: [
		formBase,
		LinkedStateMixin,
		observe( 'userSettings', 'username' ),
		eventRecorder
	],

	componentWillMount() {
		// Clear any username changes that were previously made
		this.props.username.clearValidation();
		this.props.userSettings.removeUnsavedSetting( 'user_login' );
	},

	componentDidMount() {
		debug( this.constructor.displayName + ' component is mounted.' );
		this.debouncedUsernameValidate = debounce( this.validateUsername, 600 );
	},

	componentWillUnmount() {
		debug( this.constructor.displayName + ' component is unmounting.' );
	},

	updateLanguage() {
		let valueLink = this.valueLink( 'language' );

		valueLink.requestChange = ( value ) => {
			const originalLanguage = this.props.userSettings.getOriginalSetting( 'language' );

			this.props.userSettings.updateSetting( 'language', value );
			if ( value !== originalLanguage ) {
				this.setState( { redirect: '/me/account' } );
			} else {
				this.setState( { redirect: false } );
			}
		};

		return valueLink;
	},

	validateUsername() {
		const username = this.props.userSettings.getSetting( 'user_login' );
		debug( 'Validating username ' + username );
		this.props.username.validate( username );
	},

	hasEmailValidationError() {
		return !! this.state.emailValidationError;
	},

	communityTranslator() {
		const { translate } = this.props;
		const userLocale = this.props.userSettings.getSetting( 'language' );
		const showTranslator = userLocale && userLocale !== 'en';
		if ( config.isEnabled( 'community-translator' ) && showTranslator ) {
			return (
				<FormFieldset>
					<FormLegend>{ translate( 'Community Translator' ) }</FormLegend>
					<FormLabel>
						<FormCheckbox
							checkedLink={ this.valueLink( 'enable_translator' ) }
							disabled={ this.getDisabledState() }
							id="enable_translator"
							name="enable_translator"
							onClick={ this.recordCheckboxEvent( 'Community Translator' ) }
						/>
						<span>
							{ translate( 'Enable the in-page translator where available. {{a}}Learn more{{/a}}', {
								components: {
									a: <a
											target="_blank"
											rel="noopener noreferrer"
											href="https://en.support.wordpress.com/community-translator/"
											onClick={ this.recordClickEvent( 'Community Translator Learn More Link' ) }
									/>
								}
							} ) }
						</span>
					</FormLabel>
				</FormFieldset>
			);
		}
	},

	thankTranslationContributors() {
		const { translate, userSettings } = this.props;
		const locale = userSettings.getSetting( 'language' );
		if ( ! locale || locale === 'en' ) {
			return;
		}

		const language = getLanguage( locale );
		if ( ! language ) {
			return;
		}

		// Config names are like 'fr - Francais', so strip the slug off
		const languageName = language.name.replace( /^[a-zA-Z-]* - /, '' );
		const url = 'https://translate.wordpress.com/translators/?contributor_locale=' + locale;

		return ( <FormSettingExplanation> {
			translate( 'Thanks to {{a}}all our community members who helped translate to {{language/}}{{/a}}!', {
				components: {
					a: <a
							target="_blank"
							rel="noopener noreferrer"
							href={ url }
					/>,
					language: <span>{ languageName }</span>
				}
			} ) }
		</FormSettingExplanation> );
	},

	cancelEmailChange() {
		const { translate, userSettings } = this.props;
		userSettings.cancelPendingEmailChange( ( error, response ) => {
			if ( error ) {
				debug( 'Error canceling email change: ' + JSON.stringify( error ) );
				this.props.errorNotice( translate( 'There was a problem canceling the email change. Please, try again.' ) );
			} else {
				debug( JSON.stringify( 'Email change canceled successfully' + response ) );
				this.props.successNotice( translate( 'The email change has been successfully canceled.' ) );
			}
		} );
	},

	handleRadioChange( event ) {
		const name = event.currentTarget.name;
		const value = event.currentTarget.value;
		let updateObj = {};

		updateObj[ name ] = value;

		this.setState( updateObj );
	},

	/**
	 * We handle the username (user_login) change manually through an onChange handler
	 * so that we can also run a debounced validation on the username.
	 *
	 * @param {object} event Event from onChange of user_login input
	 */
	handleUsernameChange( event ) {
		this.debouncedUsernameValidate();
		this.props.userSettings.updateSetting( 'user_login', event.currentTarget.value );
		this.setState( { usernameAction: null } );
	},

	cancelUsernameChange() {
		this.setState( {
			userLoginConfirm: null,
			usernameAction: null
		} );

		this.props.username.clearValidation();
		this.props.userSettings.removeUnsavedSetting( 'user_login' );

		if ( ! this.props.userSettings.hasUnsavedSettings() ) {
			this.props.markSaved();
		}
	},

	submitUsernameForm() {
		const username = this.props.userSettings.getSetting( 'user_login' );
		const action = null === this.state.usernameAction ? 'none' : this.state.usernameAction;

		this.setState( { submittingForm: true } );
		this.props.username.change( username, action, ( error ) => {
			this.setState( { submittingForm: false } );
			if ( error ) {
				this.props.errorNotice( this.props.username.getValidationFailureMessage() );
			} else {
				this.props.markSaved();

				// We reload here to refresh cookies, user object, and user settings.
				// @TODO: Do not require reload here.
				location.reload();
			}
		} );
	},

	onSiteSelect( siteSlug ) {
		let selectedSite = sites.getSite( siteSlug );
		if ( selectedSite ) {
			this.props.userSettings.updateSetting( 'primary_site_ID', selectedSite.ID );
		}
	},

	renderHolidaySnow() {
		// Note that years and months below are zero indexed
		const { translate } = this.props;
		const today = this.moment();
		const startDate = this.moment( {
			year: today.year(),
			month: 11,
			day: 1
		} );
		const endDate = this.moment( {
			year: today.year(),
			month: 0,
			day: 4
		} );

		if ( today.isBefore( startDate, 'day' ) && today.isAfter( endDate, 'day' ) ) {
			return;
		}

		return (
			<FormFieldset>
				<FormLegend>{ translate( 'Holiday Snow' ) }</FormLegend>
				<FormLabel>
					<FormCheckbox
						checkedLink={ this.valueLink( 'holidaysnow' ) }
						disabled={ this.getDisabledState() }
						id="holidaysnow"
						name="holidaysnow"
						onClick={ this.recordCheckboxEvent( 'Holiday Snow' ) }
					/>
					<span>{ translate( 'Show snowfall on WordPress.com sites.' ) }</span>
				</FormLabel>
			</FormFieldset>
		);
	},

	renderJoinDate() {
		const { translate } = this.props;
		const dateMoment = i18n.moment( user.get().date );

		return (
			<span>
				{
					translate( 'Joined %(month)s %(year)s', {
						args: {
							month: dateMoment.format( 'MMMM' ),
							year: dateMoment.format( 'YYYY' )
						}
					} )
				}
			</span>
		);
	},

	hasPendingEmailChange() {
		return this.props.userSettings.isPendingEmailChange();
	},

	renderPendingEmailChange() {
		const { translate, userSettings } = this.props;

		if ( ! this.hasPendingEmailChange() ) {
			return null;
		}

		return (
			<Notice
				showDismiss={ false }
				status="is-info"
				text={
					translate( 'There is a pending change of your email to %(email)s. Please check your inbox for a confirmation link.', {
						args: {
							email: userSettings.getSetting( 'new_user_email' )
						}
					} )
				}>
				<NoticeAction onClick={ this.cancelEmailChange }>
					{ translate( 'Cancel' ) }
				</NoticeAction>
			</Notice>
		);
	},

	renderUsernameValidation() {
		const { translate, username, userSettings } = this.props;

		if ( ! userSettings.isSettingUnsaved( 'user_login' ) ) {
			return null;
		}

		if ( username.isUsernameValid() ) {
			return (
				<Notice
					showDismiss={ false }
					status="is-success"
					text={ translate( '%(username)s is a valid username.', {
						args: {
							username: username.getValidatedUsername()
						}
					} ) }
				/>
			);
		} else if ( null !== username.getValidationFailureMessage() ) {
			return (
				<Notice
					showDismiss={ false }
					status="is-error"
					text={ username.getValidationFailureMessage() }
				/>
			);
		}
	},

	renderUsernameConfirmNotice() {
		const { translate, username, userSettings } = this.props;
		const usernameMatch = userSettings.getSetting( 'user_login' ) === this.state.userLoginConfirm;
		const status = usernameMatch ? 'is-success' : 'is-error';
		const text = usernameMatch
			? translate( 'Thanks for confirming your new username!' )
			: translate( 'Please re-enter your new username to confirm it.' );

		if ( ! username.isUsernameValid() ) {
			return null;
		}

		return (
			<Notice
				showDismiss={ false }
				status={ status }
				text={ text }
			/>
		);
	},

	renderPrimarySite() {
		const { translate, userSettings } = this.props;

		if ( ! user.get().visible_site_count ) {
			return (
				<a
					className="button"
					href={ config( 'signup_url' ) }
					onClick={ this.recordClickEvent( 'Primary Site Add New WordPress Button' ) }
				>
					{ translate( 'Add New Site' ) }
				</a>
			);
		}

		const primarySiteId = userSettings.getSetting( 'primary_site_ID' );

		return (
			<SitesDropdown
				key={ primarySiteId }
				isPlaceholder={ ! primarySiteId }
				selectedSiteId={ primarySiteId }
				onSiteSelect={ this.onSiteSelect }
			/>
		);
	},

	updateEmailAddress() {
		return {
			value: this.hasPendingEmailChange()
				? this.props.userSettings.getSetting( 'new_user_email' )
				: this.props.userSettings.getSetting( 'user_email' ),
			requestChange: ( value ) => {
				if ( '' === value ) {
					this.setState( { emailValidationError: 'empty' } );
				} else if ( ! emailValidator.validate( value ) ) {
					this.setState( { emailValidationError: 'invalid' } );
				} else {
					this.setState( { emailValidationError: false } );
				}
				this.props.userSettings.updateSetting( 'user_email', value );
			}
		};
	},

	renderEmailValidation() {
		const { translate, userSettings } = this.props;

		if ( ! userSettings.isSettingUnsaved( 'user_email' ) ) {
			return null;
		}

		if ( ! this.state.emailValidationError ) {
			return null;
		}
		let notice;
		switch ( this.state.emailValidationError ) {
			case 'invalid':
				notice = translate( '%(email)s is not a valid email address.', {
					args: { email: userSettings.getSetting( 'user_email' ) }
				} );
				break;
			case 'empty':
				notice = translate( 'Email address can not be empty.' );
				break;
		}

		return (
			<FormTextValidation isError={ true } text={ notice } />
		);
	},

	/*
	 * These form fields are displayed when there is not a username change in progress.
	 */
	renderAccountFields() {
		const { translate, userSettings } = this.props;

		return (
			<div className="account__settings-form" key="settingsForm">
				<FormFieldset>
					<FormLabel htmlFor="email">{ translate( 'Email Address' ) }</FormLabel>
					<FormTextInput
						disabled={ this.getDisabledState() || this.hasPendingEmailChange() }
						id="email"
						name="email"
						isError={ !! this.state.emailValidationError }
						onFocus={ this.recordFocusEvent( 'Email Address Field' ) }
						valueLink={ this.updateEmailAddress() }
						valueKey="user_email"
					/>
					{ this.renderEmailValidation() }
					{ this.renderPendingEmailChange() }
					<FormSettingExplanation>
						{ translate( 'Will not be publicly displayed' ) }
					</FormSettingExplanation>
				</FormFieldset>

				<FormFieldset>
					<FormLabel htmlFor="primary_site_ID">{ translate( 'Primary Site' ) }</FormLabel>
					{ this.renderPrimarySite() }
				</FormFieldset>

				<FormFieldset>
					<FormLabel htmlFor="url">{ translate( 'Web Address' ) }</FormLabel>
					<FormTextInput
						disabled={ this.getDisabledState() }
						id="url"
						name="url"
						onFocus={ this.recordFocusEvent( 'Web Address Field' ) }
						valueLink={ this.valueLink( 'user_URL' ) }
					/>
					<FormSettingExplanation>
						{ translate( 'Shown publicly when you comment on blogs.' ) }
					</FormSettingExplanation>
				</FormFieldset>

				<FormFieldset>
					<FormLabel htmlFor="lang_id">{ translate( 'Interface Language' ) }</FormLabel>
					<LanguageSelector
						disabled={ this.getDisabledState() }
						id="lang_id"
						languages={ config( 'languages' ) }
						name="lang_id"
						onFocus={ this.recordFocusEvent( 'Interface Language Field' ) }
						valueKey="langSlug"
						valueLink={ this.updateLanguage() }
					/>
					{ this.thankTranslationContributors() }
				</FormFieldset>

				{ this.communityTranslator() }

				{ this.renderHolidaySnow() }

				<FormButton
					isSubmitting={ this.state.submittingForm }
					disabled={ ! userSettings.hasUnsavedSettings() || this.getDisabledState() || this.hasEmailValidationError() }
					onClick={ this.recordClickEvent( 'Save Account Settings Button' ) }
				>
					{ this.state.submittingForm ? translate( 'Saving…' ) : translate( 'Save Account Settings' ) }
				</FormButton>
			</div>
		);
	},

	renderBlogActionFields() {
		const { translate, username } = this.props;
		const actions = username.getAllowedActions();

		/*
		 * If there are no actions or if there is only one action,
		 * which we assume is the 'none' action, we ignore the actions.
		 */
		if ( size( actions ) <= 1 ) {
			return;
		}

		return (
			<FormFieldset>
				<FormLegend>{ translate( 'Would you like a matching blog address too?' ) }</FormLegend>
				{
					// message is translated in the API
					map( actions, ( message, key ) => (
						<FormLabel key={ key }>
							<FormRadio
								name="usernameAction"
								onChange={ this.handleRadioChange }
								onClick={ this.recordRadioEvent( 'Username Change Blog Action' ) }
								value={ key }
								checked={ key === this.state.usernameAction }
							/>
							<span>{ message }</span>
						</FormLabel>
					) )
				}
			</FormFieldset>
		);
	},

	/*
	 * These form fields are displayed when a username change is in progress.
	 */
	renderUsernameFields() {
		const { translate, username, userSettings } = this.props;

		return (
			<div className="account__username-form" key="usernameForm">
				<FormFieldset>
					<FormLabel htmlFor="username_confirm">
						{ translate( 'Confirm Username', {
							context: 'User is being prompted to re-enter a string for verification.'
						} ) }
					</FormLabel>
					<FormTextInput
						id="username_confirm"
						name="username_confirm"
						onFocus={ this.recordFocusEvent( 'Username Confirm Field' ) }
						valueLink={ this.linkState( 'userLoginConfirm' ) } />
					{ this.renderUsernameConfirmNotice() }
					<FormSettingExplanation>{ translate( 'Confirm new username' ) }</FormSettingExplanation>
				</FormFieldset>

				{ this.renderBlogActionFields() }

				<FormSectionHeading>{ translate( 'Please Read Carefully' ) }</FormSectionHeading>

				<p>
					{ translate(
						'You are about to change your username, which is currently {{strong}}%(username)s{{/strong}}. ' +
						'You will not be able to change your username back.',
						{
							args: {
								username: user.get().username
							},
							components: {
								strong: <strong />
							}
						}
					) }
				</p>

				<p>
					{ translate(
						'If you just want to change your display name, which is currently {{strong}}%(displayName)s{{/strong}}, ' +
						'you can do so under {{myProfileLink}}My Profile{{/myProfileLink}}.',
						{
							args: {
								displayName: user.get().display_name
							},
							components: {
								myProfileLink: <a href="/me" onClick={ this.recordClickEvent( 'My Profile Link in Username Change', this.props.markSaved ) } />,
								strong: <strong />
							}
						}
					) }
				</p>

				<p>{ translate( 'Changing your username will also affect your Gravatar profile and IntenseDebate profile addresses.' ) }</p>

				<p>{ translate( 'If you would still like to change your username, please save your changes. Otherwise, hit the cancel button below.' ) }</p>

				<FormButtonsBar>
					<FormButton
						disabled={ ( userSettings.getSetting( 'user_login' ) !== this.state.userLoginConfirm ) || ! username.isUsernameValid() || this.state.submittingForm }
						type="button"
						onClick={ this.recordClickEvent( 'Change Username Button', this.submitUsernameForm ) }
					>
						{ translate( 'Save Username' ) }
					</FormButton>

					<FormButton
						isPrimary={ false }
						type="button"
						onClick={ this.recordClickEvent( 'Cancel Username Change Button', this.cancelUsernameChange ) }
					>
						{ translate( 'Cancel' ) }
					</FormButton>
				</FormButtonsBar>
			</div>
		);
	},

	render() {
		const { markChanged, translate, userSettings } = this.props;
		// Is a username change in progress?
		const renderUsernameForm = userSettings.isSettingUnsaved( 'user_login' );

		return (
			<Main className="account">
				<MeSidebarNavigation />
				<ReauthRequired twoStepAuthorization={ twoStepAuthorization } />
				<Card className="account__settings">
					<form onChange={ markChanged } onSubmit={ this.submitForm } >
						<FormFieldset>
							<FormLabel htmlFor="username">{ translate( 'Username' ) }</FormLabel>
								<FormTextInput
									autoComplete="off"
									className="account__username"
									disabled={ this.getDisabledState() || ! userSettings.getSetting( 'user_login_can_be_changed' ) }
									id="username"
									name="username"
									onFocus={ this.recordFocusEvent( 'Username Field' ) }
									onChange={ this.handleUsernameChange }
									value={ userSettings.getSetting( 'user_login' ) }
								/>
								{ this.renderUsernameValidation() }
								<FormSettingExplanation>{ this.renderJoinDate() }</FormSettingExplanation>
						</FormFieldset>

						{ /* This is how we animate showing/hiding the form field sections */ }
						<ReactCSSTransitionGroup
							transitionName="account__username-form-toggle"
							transitionEnterTimeout={ 500 }
							transitionLeaveTimeout={ 10 }
						>
							{ renderUsernameForm ? this.renderUsernameFields() : this.renderAccountFields() }
						</ReactCSSTransitionGroup>
					</form>
				</Card>
			</Main>
		);
	}
} );

export default compose(
	connect(
		null,
		dispatch => bindActionCreators( { successNotice, errorNotice }, dispatch ),
	),
	localize,
	protectForm,
)( Account );
