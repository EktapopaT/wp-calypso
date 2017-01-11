/**
 * External dependencies
 */
import React, { Component, PropTypes } from 'react';
import { localize } from 'i18n-calypso';
import { connect } from 'react-redux';

/**
 * Internal dependencies
 */
import SectionHeader from 'components/section-header';
import Card from 'components/card';
import Button from 'components/button';
import FormSelect from 'components/forms/form-select';
import FormLabel from 'components/forms/form-label';
import FormCheckbox from 'components/forms/form-checkbox';
import JetpackModuleToggle from '../jetpack-module-toggle';
import FormFieldset from 'components/forms/form-fieldset';
import InfoPopover from 'components/info-popover';
import ExternalLink from 'components/external-link';
import { protectForm } from 'lib/protect-form';

import {
	getJetpackSetting,
	isRequestingJetpackSettings,
	isUpdatingJetpackSettings
} from 'state/jetpack/settings/selectors';
import { updateSettings } from 'state/jetpack/settings/actions';

class MediaSettings extends Component {
	constructor( props ) {
		super( props );
		this.state = {
			carousel_display_exif: props.carousel_display_exif,
			carousel_background_color: props.carousel_background_color
		};
	}

	componentWillReceiveProps( newProps ) {
		this.setState( {
			carousel_display_exif: newProps.carousel_display_exif,
			carousel_background_color: newProps.carousel_background_color
		} );
	}

	handleCarouselDisplayExif = ( event ) => {
		this.setState( {
			carousel_display_exif: event.target.checked
		} );
		this.props.markChanged();
	}
	handleCarouselBackgroundColor = ( event ) => {
		this.setState( {
			carousel_background_color: event.target.value
		} );
		this.props.markChanged();
	}

	updateSettings = () => {
		return this.props.updateSettings( this.props.site.ID, {
			carousel_background_color: this.state.carousel_background_color,
			carousel_display_exif: this.state.carousel_display_exif
		} ).then( () => {
			this.props.markSaved();
		} );
	}

	render() {
		const props = this.props;
		return (
			<form id="media-settings" onSubmit={ this.updateSettings }>
				<SectionHeader label={ props.translate( 'Media' ) }>
					<Button
						compact
						primary
						onClick={ this.updateSettings }
						disabled={ props.isRequestingJetpackSettings || props.submittingForm }>
						{ props.submittingForm ? props.translate( 'Saving…' ) : props.translate( 'Save Settings' ) }
					</Button>
				</SectionHeader>
				<Card className="media-settings__card site-settings">
					<FormFieldset>
						<div className="media-settings__info-link-container">
							<InfoPopover position={ 'left' }>
								<ExternalLink icon={ true } href={ 'https://jetpack.com/support/photon' } >
									{ props.translate( 'Learn more about Photon' ) }
								</ExternalLink>
							</InfoPopover>
						</div>
						<JetpackModuleToggle
							siteId={ props.site.ID }
							moduleSlug="photon"
							label={ props.translate( 'Speed up your images and photos with Photon.' ) }
							description="Enabling Photon is required to use Tiled Galleries."
							/>
					</FormFieldset>
					<FormFieldset className="has-divider is-top-only">
						<div className="media-settings__info-link-container">
							<InfoPopover position={ 'left' }>
								<ExternalLink icon={ true } href={ 'https://jetpack.com/support/carousel' } >
									{ props.translate( 'Learn more about Carousel' ) }
								</ExternalLink>
							</InfoPopover>
						</div>
						<JetpackModuleToggle
							siteId={ props.site.ID }
							moduleSlug="carousel"
							label={ props.translate( 'Transform image galleries into full screen slideshows.' ) }
							/>
						{
							( props.carouselActive && (
								<div className="media-settings__module-settings is-indented">
									<FormLabel>
										<FormCheckbox
											checked={ this.state.carousel_display_exif }
											onChange={ this.handleCarouselDisplayExif }
											disabled={ props.submittingForm }
											name="carousel_display_exif" />
										<span>{ props.translate( 'Show photo metadata (Exif) in carousel, when available' ) }</span>
									</FormLabel>
									<FormLabel htmlFor="carousel_background_color">
										{ props.translate( 'Background color' ) }
									</FormLabel>
									<FormSelect
										value={ this.state.carousel_background_color }
										onChange={ this.handleCarouselBackgroundColor }
										disabled={ props.submittingForm }
										name="carousel_background_color"
										id="carousel_background_color" >
										<option value={ 'black' } key={ 'carousel_background_color_black' }>
											{ props.translate( 'Black' ) }
										</option>
										<option value={ 'white' } key={ 'carousel_background_color_white' }>
											{ props.translate( 'White' ) }
										</option>
									</FormSelect>
								</div>
							) )
						}
					</FormFieldset>
				</Card>
			</form>
		);
	}
}

MediaSettings.propTypes = {
	carouselActive: PropTypes.bool.isRequired,
	isRequestingJetpackSettings: PropTypes.bool.isRequired,
	submittingForm: PropTypes.bool,
	site: PropTypes.object.isRequired
};

const mapStateToProps = ( state, ownProps ) => {
	return {
		submittingForm: !! isUpdatingJetpackSettings( state, ownProps.site.ID ),
		isRequestingJetpackSettings: isRequestingJetpackSettings( state, ownProps.site.ID ) || false,
		carouselActive: !! getJetpackSetting( state, ownProps.site.ID, 'carousel' ),
		photonActive: !! getJetpackSetting( state, ownProps.site.ID, 'photon' ),
		carousel_background_color: getJetpackSetting( state, ownProps.site.ID, 'carousel_background_color' ),
		carousel_display_exif: getJetpackSetting( state, ownProps.site.ID, 'carousel_display_exif' )
	};
};

export default connect(
	mapStateToProps,
	{
		updateSettings
	}
)( localize( protectForm( MediaSettings ) ) );
